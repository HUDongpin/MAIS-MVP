import {
  chmod,
  lstat,
  mkdir,
  open,
  readFile,
  rename,
  stat,
  unlink,
} from "node:fs/promises";
import path from "node:path";

import {
  calculateArtifactHash,
  canonicalJson,
  sha256Hex,
} from "../../research/mais-natural-ca60-v1/versions/design-v4/design-contract.mjs";

const DESIGN_ID = "MAIS-NATURAL-CA60-V4";
const PROTECTED_RELATIVE_ROOT = ".local/mais-natural-ca60-v1";
const SHA256 = /^[0-9a-f]{64}$/u;
const GIT_OID = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u;
const SAFE_RUN_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;
const SECRET_KEY = /^(?:apiKey|authorizationHeader|password|credentialValue|secretValue|cookie|accessToken|refreshToken|bearerToken|rawError|errorStack)$/iu;
const SECRET_VALUE = /(?:sk-[A-Za-z0-9_-]{12,}|Bearer\s+[A-Za-z0-9._-]{12,}|BEGIN\s+(?:RSA\s+|EC\s+|OPENSSH\s+)?PRIVATE\s+KEY)/u;

const REGISTRY_FIELDS = Object.freeze([
  "schemaVersion",
  "designId",
  "designRegistrationHash",
  "runnerCommit",
  "runnerSourceManifest",
  "runnerSourceManifestRootHash",
  "runnerHash",
  "adapterHash",
  "protectedArtifactRoot",
  "providerExecutionAuthorized",
  "aggregatePublicationAuthorized",
  "createdAt",
  "previousRegistryHash",
  "registryHash",
]);

const MARKER_FIELDS = Object.freeze([
  "schemaVersion",
  "designId",
  "registrationHash",
  "sampleManifestHash",
  "referenceSealHash",
  "executionRegistrationHash",
  "itemId",
  "itemHash",
  "clusterId",
  "roleOrder",
  "attemptReceiptHashes",
  "outputHashes",
  "atomicWrite",
  "fileMode",
  "markerHash",
]);

function plainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function codePointCompare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sameFields(value, expected) {
  return plainObject(value)
    && canonicalJson(Object.keys(value).sort()) === canonicalJson([...expected].sort());
}

function validDateTime(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function safeRelativePath(value) {
  return typeof value === "string"
    && value.length > 0
    && !path.isAbsolute(value)
    && !value.split(/[\\/]/u).includes("..")
    && !value.includes("\0");
}

function assertAbsoluteRepoRoot(repoRoot) {
  if (typeof repoRoot !== "string" || !path.isAbsolute(repoRoot)) {
    throw new Error("repoRoot must be an absolute path");
  }
  return path.resolve(repoRoot);
}

function assertRunId(runId) {
  if (typeof runId !== "string" || !SAFE_RUN_ID.test(runId) || runId.includes("..")) {
    throw new Error("runId is unsafe");
  }
  return runId;
}

function assertNoSecretMaterial(value, at = "artifact") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoSecretMaterial(entry, `${at}[${index}]`));
    return;
  }
  if (plainObject(value)) {
    for (const [key, entry] of Object.entries(value)) {
      if (SECRET_KEY.test(key)) throw new Error(`secret-bearing field is forbidden at ${at}.${key}`);
      assertNoSecretMaterial(entry, `${at}.${key}`);
    }
    return;
  }
  if (typeof value === "string" && SECRET_VALUE.test(value)) {
    throw new Error(`secret-bearing value is forbidden at ${at}`);
  }
}

async function fsyncDirectory(directory) {
  const handle = await open(directory, "r");
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function ensurePrivateDirectory(directory) {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await chmod(directory, 0o700);
}

async function readJsonIfPresent(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function withExclusiveLock(lockPath, operation) {
  let lock;
  try {
    lock = await open(lockPath, "wx", 0o600);
  } catch (error) {
    if (error?.code === "EEXIST") throw new Error(`persistence lock conflict at ${lockPath}`);
    throw error;
  }
  try {
    await lock.sync();
    return await operation();
  } finally {
    await lock.close();
    await unlink(lockPath).catch((error) => {
      if (error?.code !== "ENOENT") throw error;
    });
  }
}

async function atomicWriteJson0600(filePath, value) {
  assertNoSecretMaterial(value);
  const directory = path.dirname(filePath);
  await ensurePrivateDirectory(directory);
  const lockPath = `${filePath}.lock`;
  return withExclusiveLock(lockPath, async () => {
    const existing = await readJsonIfPresent(filePath);
    if (existing !== null) {
      if (canonicalJson(existing) === canonicalJson(value)) return { created: false, path: filePath };
      throw new Error(`protected artifact conflict at ${filePath}`);
    }

    const temporary = `${filePath}.tmp-${process.pid}-${sha256Hex(`${filePath}:${Date.now()}:${Math.random()}`).slice(0, 16)}`;
    let handle;
    try {
      handle = await open(temporary, "wx", 0o600);
      await handle.writeFile(`${canonicalJson(value)}\n`, "utf8");
      await handle.sync();
      await handle.close();
      handle = null;
      await chmod(temporary, 0o600);
      await rename(temporary, filePath);
      await chmod(filePath, 0o600);
      await fsyncDirectory(directory);
      return { created: true, path: filePath };
    } finally {
      if (handle) await handle.close();
      await unlink(temporary).catch((error) => {
        if (error?.code !== "ENOENT") throw error;
      });
    }
  });
}

export function protectedPathsV1(repoRoot) {
  const resolvedRepoRoot = assertAbsoluteRepoRoot(repoRoot);
  const protectedRoot = path.join(resolvedRepoRoot, PROTECTED_RELATIVE_ROOT);
  return Object.freeze({
    repoRoot: resolvedRepoRoot,
    protectedRoot,
    custodyDirectory: path.join(protectedRoot, "custody"),
    custodyRegistryPath: path.join(protectedRoot, "custody", "registry.json"),
    runsDirectory: path.join(protectedRoot, "runs"),
  });
}

export async function buildRunnerSourceManifestV1({ repoRoot, relativePaths }) {
  const resolvedRepoRoot = assertAbsoluteRepoRoot(repoRoot);
  if (!Array.isArray(relativePaths) || relativePaths.length === 0) {
    throw new Error("runner source path list is required");
  }
  if (new Set(relativePaths).size !== relativePaths.length) {
    throw new Error("runner source paths must be unique");
  }
  const requiredPrefix = "coordination/content-qa/mais-natural-ca60-v1/";
  const rows = [];
  for (const relativePath of relativePaths) {
    if (!safeRelativePath(relativePath)
      || !relativePath.startsWith(requiredPrefix)
      || relativePath.includes("\\")) {
      throw new Error(`runner source path is outside the package: ${String(relativePath)}`);
    }
    const absolutePath = path.resolve(resolvedRepoRoot, relativePath);
    const observedRelative = path.relative(resolvedRepoRoot, absolutePath).split(path.sep).join("/");
    if (observedRelative !== relativePath) throw new Error(`runner source path normalization mismatch: ${relativePath}`);
    const metadata = await lstat(absolutePath);
    if (!metadata.isFile() || metadata.isSymbolicLink()) {
      throw new Error(`runner source path must be a regular file, not a symbolic link: ${relativePath}`);
    }
    const bytes = await readFile(absolutePath);
    rows.push({
      path: relativePath,
      byteLength: bytes.byteLength,
      sha256: sha256Hex(bytes),
    });
  }
  return Object.freeze(normalizeSourceManifest(rows).map((row) => Object.freeze(row)));
}

function normalizeSourceManifest(input) {
  if (!Array.isArray(input) || input.length === 0) throw new Error("runner source manifest is required");
  const rows = input.map((row) => {
    if (!sameFields(row, ["path", "byteLength", "sha256"])) throw new Error("runner source manifest row fields invalid");
    if (!safeRelativePath(row.path)) throw new Error("runner source manifest path invalid");
    if (!Number.isSafeInteger(row.byteLength) || row.byteLength < 0) throw new Error("runner source byte length invalid");
    if (!SHA256.test(row.sha256)) throw new Error("runner source hash invalid");
    return { path: row.path, byteLength: row.byteLength, sha256: row.sha256 };
  }).sort((left, right) => codePointCompare(left.path, right.path));
  if (new Set(rows.map((row) => row.path)).size !== rows.length) throw new Error("runner source manifest paths must be unique");
  return rows;
}

export function buildProtectedExecutionCustodyRegistryV1(input) {
  if (!plainObject(input)) throw new Error("custody registry input must be an object");
  const { protectedRoot } = protectedPathsV1(input.repoRoot);
  if (!SHA256.test(input.designRegistrationHash)) throw new Error("design registration hash invalid");
  if (!GIT_OID.test(input.runnerCommit)) throw new Error("runner commit invalid");
  if (input.adapterHash !== null && !SHA256.test(input.adapterHash)) throw new Error("adapter hash invalid");
  if (!validDateTime(input.createdAt)) throw new Error("custody creation timestamp invalid");
  if (input.previousRegistryHash !== null && !SHA256.test(input.previousRegistryHash)) throw new Error("previous registry hash invalid");
  const runnerSourceManifest = normalizeSourceManifest(input.runnerSourceManifest);
  const runnerSourceManifestRootHash = sha256Hex(canonicalJson(runnerSourceManifest));
  const runnerHash = sha256Hex(canonicalJson({
    runnerCommit: input.runnerCommit,
    runnerSourceManifestRootHash,
  }));
  const body = {
    schemaVersion: "ProtectedExecutionCustodyRegistryV1",
    designId: DESIGN_ID,
    designRegistrationHash: input.designRegistrationHash,
    runnerCommit: input.runnerCommit,
    runnerSourceManifest,
    runnerSourceManifestRootHash,
    runnerHash,
    adapterHash: input.adapterHash,
    protectedArtifactRoot: protectedRoot,
    providerExecutionAuthorized: false,
    aggregatePublicationAuthorized: false,
    createdAt: input.createdAt,
    previousRegistryHash: input.previousRegistryHash,
  };
  return Object.freeze({ ...body, registryHash: calculateArtifactHash(body, "registryHash") });
}

export function validateProtectedExecutionCustodyRegistryV1(registry, expected = {}) {
  const errors = [];
  if (!sameFields(registry, REGISTRY_FIELDS)) return ["custody registry fields invalid"];
  if (registry.schemaVersion !== "ProtectedExecutionCustodyRegistryV1" || registry.designId !== DESIGN_ID) errors.push("custody registry identity invalid");
  if (!SHA256.test(registry.designRegistrationHash)) errors.push("custody design registration hash invalid");
  if (!GIT_OID.test(registry.runnerCommit)) errors.push("custody runner commit invalid");
  if (!SHA256.test(registry.runnerSourceManifestRootHash) || !SHA256.test(registry.runnerHash)) errors.push("custody runner roots invalid");
  if (registry.adapterHash !== null && !SHA256.test(registry.adapterHash)) errors.push("custody adapter hash invalid");
  if (registry.providerExecutionAuthorized !== false || registry.aggregatePublicationAuthorized !== false) errors.push("custody registry must be nonauthorizing");
  if (!validDateTime(registry.createdAt)) errors.push("custody creation timestamp invalid");
  if (registry.previousRegistryHash !== null && !SHA256.test(registry.previousRegistryHash)) errors.push("custody previous registry hash invalid");
  let normalizedManifest;
  try {
    normalizedManifest = normalizeSourceManifest(registry.runnerSourceManifest);
    if (canonicalJson(normalizedManifest) !== canonicalJson(registry.runnerSourceManifest)) errors.push("custody source manifest order invalid");
    if (sha256Hex(canonicalJson(normalizedManifest)) !== registry.runnerSourceManifestRootHash) errors.push("custody source manifest root mismatch");
    if (sha256Hex(canonicalJson({ runnerCommit: registry.runnerCommit, runnerSourceManifestRootHash: registry.runnerSourceManifestRootHash })) !== registry.runnerHash) errors.push("custody runner hash mismatch");
  } catch (error) {
    errors.push(`custody source manifest invalid: ${error instanceof Error ? error.message : "unknown"}`);
  }
  if (calculateArtifactHash(registry, "registryHash") !== registry.registryHash) errors.push("custody registry self hash mismatch");
  if (expected.repoRoot !== undefined) {
    try {
      if (registry.protectedArtifactRoot !== protectedPathsV1(expected.repoRoot).protectedRoot) errors.push("custody protected root mismatch");
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "custody expected root invalid");
    }
  }
  for (const field of ["designRegistrationHash", "runnerCommit", "runnerHash", "adapterHash"]) {
    if (Object.hasOwn(expected, field) && registry[field] !== expected[field]) errors.push(`custody ${field} mismatch`);
  }
  try {
    assertNoSecretMaterial(registry);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "custody secret screen failed");
  }
  return [...new Set(errors)];
}

export async function writeProtectedExecutionCustodyRegistryV1({ repoRoot, registry }) {
  const errors = validateProtectedExecutionCustodyRegistryV1(registry, { repoRoot });
  if (errors.length > 0) throw new Error(`custody registry invalid: ${errors.join("; ")}`);
  return atomicWriteJson0600(protectedPathsV1(repoRoot).custodyRegistryPath, registry);
}

export async function readProtectedExecutionCustodyRegistryV1({ repoRoot }) {
  const paths = protectedPathsV1(repoRoot);
  const registry = await readJsonIfPresent(paths.custodyRegistryPath);
  if (registry === null) return null;
  const errors = validateProtectedExecutionCustodyRegistryV1(registry, { repoRoot });
  if (errors.length > 0) throw new Error(`stored custody registry invalid: ${errors.join("; ")}`);
  if ((((await stat(paths.custodyRegistryPath)).mode & 0o777) !== 0o600)) {
    throw new Error("stored custody registry mode is not 0600");
  }
  return registry;
}

function chainHash(receipt) {
  return calculateArtifactHash(receipt, "selfHash");
}

async function readAttemptChain(filePath) {
  let text;
  try {
    text = await readFile(filePath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
  if (text.length === 0) return [];
  if (!text.endsWith("\n")) throw new Error("attempt chain has incomplete trailing data");
  const receipts = [];
  for (const [index, line] of text.slice(0, -1).split("\n").entries()) {
    if (line.length === 0) throw new Error(`attempt chain line ${index + 1} is empty`);
    try {
      receipts.push(JSON.parse(line));
    } catch {
      throw new Error(`attempt chain parse failure at line ${index + 1}`);
    }
  }
  return receipts;
}

function validateAttemptChain(receipts, runId) {
  const errors = [];
  let previous = null;
  receipts.forEach((receipt, index) => {
    if (!plainObject(receipt)) {
      errors.push(`attempt ${index + 1} is not an object`);
      return;
    }
    if (receipt.runId !== runId) errors.push(`attempt ${index + 1} runId mismatch`);
    if (receipt.sequenceNumber !== index + 1) errors.push(`attempt ${index + 1} sequence mismatch`);
    if (receipt.previousReceiptHash !== previous) errors.push(`attempt ${index + 1} previous receipt hash mismatch`);
    if (!SHA256.test(receipt.selfHash ?? "") || chainHash(receipt) !== receipt.selfHash) errors.push(`attempt ${index + 1} self hash mismatch`);
    try {
      assertNoSecretMaterial(receipt);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `attempt ${index + 1} secret screen failed`);
    }
    previous = receipt.selfHash ?? null;
  });
  return [...new Set(errors)];
}

export function createAttemptReceiptStoreV1({ repoRoot, runId }) {
  const paths = protectedPathsV1(repoRoot);
  const safeRunId = assertRunId(runId);
  const runDirectory = path.join(paths.runsDirectory, safeRunId);
  const filePath = path.join(runDirectory, "attempts.jsonl");
  const lockPath = path.join(runDirectory, "attempts.lock");
  return Object.freeze({
    path: filePath,
    async read() {
      const receipts = await readAttemptChain(filePath);
      const errors = validateAttemptChain(receipts, safeRunId);
      if (errors.length > 0) throw new Error(`attempt chain invalid: ${errors.join("; ")}`);
      return receipts;
    },
    async validate() {
      try {
        const receipts = await readAttemptChain(filePath);
        const errors = validateAttemptChain(receipts, safeRunId);
        if (receipts.length > 0 && (((await stat(filePath)).mode & 0o777) !== 0o600)) {
          errors.push("attempt receipt file mode is not 0600");
        }
        return { receipts, errors: [...new Set(errors)] };
      } catch (error) {
        return { receipts: [], errors: [error instanceof Error ? error.message : "attempt chain validation failed"] };
      }
    },
    async append(payload) {
      if (!plainObject(payload)) throw new Error("attempt payload must be an object");
      if (payload.runId !== safeRunId) throw new Error("attempt payload runId mismatch");
      for (const forbidden of ["sequenceNumber", "previousReceiptHash", "selfHash"]) {
        if (Object.hasOwn(payload, forbidden)) throw new Error(`attempt payload may not supply ${forbidden}`);
      }
      assertNoSecretMaterial(payload);
      await ensurePrivateDirectory(runDirectory);
      return withExclusiveLock(lockPath, async () => {
        const receipts = await readAttemptChain(filePath);
        const errors = validateAttemptChain(receipts, safeRunId);
        if (errors.length > 0) throw new Error(`attempt chain invalid before append: ${errors.join("; ")}`);
        const body = {
          ...structuredClone(payload),
          sequenceNumber: receipts.length + 1,
          previousReceiptHash: receipts.at(-1)?.selfHash ?? null,
        };
        const receipt = { ...body, selfHash: chainHash(body) };
        const handle = await open(filePath, "a", 0o600);
        try {
          await handle.write(`${canonicalJson(receipt)}\n`, null, "utf8");
          await handle.sync();
        } finally {
          await handle.close();
        }
        await chmod(filePath, 0o600);
        await fsyncDirectory(runDirectory);
        return receipt;
      });
    },
  });
}

function validateCompletedItemMarker(marker) {
  const errors = [];
  if (!sameFields(marker, MARKER_FIELDS)) return ["completed item marker fields invalid"];
  if (marker.schemaVersion !== "CompletedItemCommitMarkerV1" || marker.designId !== DESIGN_ID) errors.push("completed item marker identity invalid");
  for (const field of ["registrationHash", "sampleManifestHash", "referenceSealHash", "executionRegistrationHash", "itemHash", "markerHash"]) {
    if (!SHA256.test(marker[field] ?? "")) errors.push(`completed item ${field} invalid`);
  }
  if (typeof marker.itemId !== "string" || marker.itemId.length === 0 || typeof marker.clusterId !== "string" || marker.clusterId.length === 0) errors.push("completed item identity fields invalid");
  const allowedRoleOrders = [
    ["B_PRIME_CRITIQUE", "B_PRIME_REVISION"],
    ["B_PRIME_CRITIQUE", "B_PRIME_REVISION", "C0_PRIME_ROLE_1", "C0_PRIME_ROLE_2", "C0_PRIME_ROLE_3", "C0_PRIME_ROLE_4", "C0_PRIME_ROLE_5"],
  ];
  if (!allowedRoleOrders.some((order) => canonicalJson(order) === canonicalJson(marker.roleOrder))) errors.push("completed item role order invalid");
  for (const field of ["attemptReceiptHashes", "outputHashes"]) {
    if (!Array.isArray(marker[field]) || marker[field].length !== marker.roleOrder?.length || marker[field].some((value) => !SHA256.test(value)) || new Set(marker[field]).size !== marker[field].length) {
      errors.push(`completed item ${field} invalid`);
    }
  }
  if (marker.atomicWrite !== true || marker.fileMode !== "0600") errors.push("completed item persistence declaration invalid");
  if (calculateArtifactHash(marker, "markerHash") !== marker.markerHash) errors.push("completed item marker self hash mismatch");
  try {
    assertNoSecretMaterial(marker);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "completed item secret screen failed");
  }
  return [...new Set(errors)];
}

export async function writeCompletedItemCommitMarkerV1({ repoRoot, runId, marker }) {
  const safeRunId = assertRunId(runId);
  const errors = validateCompletedItemMarker(marker);
  if (errors.length > 0) throw new Error(`completed item marker invalid: ${errors.join("; ")}`);
  const filePath = path.join(
    protectedPathsV1(repoRoot).runsDirectory,
    safeRunId,
    "completed-items",
    `${marker.itemHash}.json`,
  );
  return atomicWriteJson0600(filePath, marker);
}

export function buildRunnerPersistenceProofV1(input) {
  if (!plainObject(input)) throw new Error("runner persistence proof input must be an object");
  const body = {
    schemaVersion: "RunnerPersistenceProofV1",
    appendOnlyTestPassed: input.appendOnlyTestPassed,
    atomicRenameTestPassed: input.atomicRenameTestPassed,
    fileModeObserved: input.fileModeObserved,
    fileStatTestPassed: input.fileStatTestPassed,
    fsyncFileTestPassed: input.fsyncFileTestPassed,
    fsyncDirectoryTestPassed: input.fsyncDirectoryTestPassed,
    secretSentinelAbsent: input.secretSentinelAbsent,
    rawErrorSentinelAbsent: input.rawErrorSentinelAbsent,
    testCommandHash: input.testCommandHash,
    fixtureRootHash: input.fixtureRootHash,
  };
  return Object.freeze({ ...body, proofHash: calculateArtifactHash(body, "proofHash") });
}
