import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { access, chmod, mkdir, mkdtemp, readFile, readdir, realpath, rename, rm, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PROTOCOL_ID, PROTOCOL_VERSION, SOURCE_BASELINE } from "./calibration-design.mjs";
import { runBoundedProcess } from "./process-lifecycle.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const probeWorkerSource = path.join(scriptDirectory, "isolation-probe-worker.mjs");

function sha256(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function seatbeltLiteral(value) {
  return JSON.stringify(path.resolve(value));
}

function ancestorLiterals(filePath) {
  const resolved = path.resolve(filePath);
  const parsed = path.parse(resolved);
  const parts = resolved.slice(parsed.root.length).split(path.sep).filter(Boolean);
  const ancestors = [parsed.root];
  let current = parsed.root;
  for (const part of parts.slice(0, -1)) {
    current = path.join(current, part);
    ancestors.push(current);
  }
  return [...new Set(ancestors)].map((row) => `(literal ${seatbeltLiteral(row)})`).join(" ");
}

export function buildSeatbeltProfile({ nodeExecutable, runtimeDirectory, inputPath, ownOutbox }) {
  const metadataAncestors = [nodeExecutable, runtimeDirectory, inputPath, ownOutbox]
    .map(ancestorLiterals)
    .join(" ");
  return [
    "(version 1)",
    "(deny default)",
    "(import \"system.sb\")",
    "(deny process-fork)",
    "(allow process-exec)",
    `(allow file-read-metadata file-test-existence ${metadataAncestors} (subpath ${seatbeltLiteral(runtimeDirectory)}) (subpath ${seatbeltLiteral(ownOutbox)}))`,
    `(allow file-read* file-test-existence (literal ${seatbeltLiteral(nodeExecutable)}) (subpath ${seatbeltLiteral(runtimeDirectory)}) (literal ${seatbeltLiteral(inputPath)}))`,
    `(allow file-map-executable (literal ${seatbeltLiteral(nodeExecutable)}))`,
    `(allow file-write* file-test-existence (subpath ${seatbeltLiteral(ownOutbox)}))`
  ].join("\n");
}

export function sanitizeIsolationEnvironment(_sourceEnvironment, { roleId, temporaryDirectory }) {
  return {
    LANG: "C",
    LC_ALL: "C",
    MAIS_ROLE_ID: roleId,
    NO_PROXY: "*",
    TMPDIR: temporaryDirectory
  };
}

function validRoleId(roleId) {
  return typeof roleId === "string" && /^[a-z0-9][a-z0-9-]{0,63}$/.test(roleId);
}

function isInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export function validateIsolationReceipt(receipt, { expectedRoleIds, candidateSetSha256 }) {
  const findings = [];
  const push = (code, detail) => findings.push({ code, detail });
  if (!receipt || typeof receipt !== "object") return [{ code: "receipt-shape", detail: "Isolation receipt is not an object." }];
  if (
    receipt.protocolId !== PROTOCOL_ID
    || receipt.protocolVersion !== PROTOCOL_VERSION
    || receipt.sourceBaseline !== SOURCE_BASELINE
  ) push("protocol-boundary", "Isolation receipt is not bound to the frozen protocol and source baseline.");
  if (!/^[a-f0-9]{64}$/.test(candidateSetSha256 ?? "") || receipt.candidateSetSha256 !== candidateSetSha256) {
    push("candidate-set-commitment", "Isolation receipt is not bound to the exact candidate set.");
  }
  if (
    receipt.status !== "isolation-probe-pass"
    || receipt.enforcementMode !== "macos-seatbelt-deny-default"
    || receipt.sameUidAdversaryModel !== true
    || receipt.browserEstimandExcluded !== true
    || receipt.liveProviderAuthorized !== false
    || receipt.formalExecutionAuthorized !== false
    || receipt.productionAuthorized !== false
  ) push("authorization-boundary", "Isolation status, enforcement mode, or fail-closed authorization fields drifted.");
  const expectedEnvironment = ["LANG", "LC_ALL", "MAIS_ROLE_ID", "NO_PROXY", "TMPDIR"];
  if (JSON.stringify(receipt.cleanEnvironmentAllowlist) !== JSON.stringify(expectedEnvironment)) {
    push("environment-allowlist", "Role environment allowlist drifted or contains additional variables.");
  }
  if (JSON.stringify(receipt.runtimeInventory) !== JSON.stringify(["isolation-probe-worker.mjs"])) {
    push("runtime-inventory", "The isolated runtime contains an unexpected file or dependency tree.");
  }
  const roles = Array.isArray(receipt.roles) ? receipt.roles : [];
  if (!Array.isArray(expectedRoleIds) || expectedRoleIds.some((roleId) => !validRoleId(roleId)) || roles.some((role) => !validRoleId(role?.roleId))) {
    push("role-id-shape", "Isolation role IDs must be opaque safe identifiers, never paths or traversal tokens.");
  }
  if (
    !Array.isArray(expectedRoleIds)
    || expectedRoleIds.length < 2
    || JSON.stringify(roles.map((row) => row.roleId)) !== JSON.stringify(expectedRoleIds)
  ) push("role-topology", "Isolation receipt role topology does not match the requested independent roles.");
  for (const role of roles) {
    const invariants = [
      role.inputReadAllowed,
      role.ownOutboxWriteAllowed,
      role.protectedCanaryReadDenied,
      role.protectedCanaryMetadataDenied,
      role.protectedSymlinkEscapeDenied,
      role.inputWriteDenied,
      role.inputChmodDenied,
      role.siblingOutboxWriteDenied,
      role.siblingSymlinkWriteDenied,
      role.repositoryReadDenied,
      role.networkDenied,
      role.credentialEnvironmentAbsent,
      role.childProcessSpawnDenied
    ];
    if (
      !invariants.every((value) => value === true)
      || role.inputSha256Before !== role.inputSha256After
      || !/^[a-f0-9]{64}$/.test(role.inputSha256Before ?? "")
      || !/^[a-f0-9]{64}$/.test(role.profileSha256 ?? "")
      || role.exitCode !== 0
    ) push("isolation-invariant", `A deny-default invariant failed for ${role.roleId ?? "<unknown-role>"}.`);
  }
  const { receiptSha256, ...receiptBody } = receipt;
  if (receiptSha256 !== sha256(JSON.stringify(receiptBody))) push("receipt-hash", "Isolation receipt self-hash mismatch.");
  return findings;
}

export async function writeIsolationReceipt(receiptPath, receipt, { expectedRoleIds, candidateSetSha256 }) {
  const findings = validateIsolationReceipt(receipt, { expectedRoleIds, candidateSetSha256 });
  if (findings.length > 0) throw new Error(`Invalid isolation receipt: ${findings.map((row) => row.code).join(", ")}`);
  await mkdir(path.dirname(receiptPath), { recursive: true });
  const temporaryPath = path.join(path.dirname(receiptPath), `.${path.basename(receiptPath)}.${process.pid}.${randomUUID()}.tmp`);
  try {
    await writeFile(temporaryPath, `${JSON.stringify(receipt, null, 2)}\n`, { encoding: "utf8", mode: 0o644, flag: "wx" });
    await chmod(temporaryPath, 0o644);
    await rename(temporaryPath, receiptPath);
    await chmod(receiptPath, 0o644);
  } finally {
    await unlink(temporaryPath).catch((error) => {
      if (error?.code !== "ENOENT") throw error;
    });
  }
  return receipt;
}

async function assertSeatbeltAvailable(sandboxExecutable) {
  if (process.platform !== "darwin") throw new Error("Seatbelt enforcement is unavailable: this host is not macOS.");
  try {
    await access(sandboxExecutable, constants.X_OK);
  } catch {
    throw new Error(`Seatbelt enforcement is unavailable at ${sandboxExecutable}.`);
  }
}

export async function runIsolationMatrix({
  repositoryRoot,
  roleIds = ["role-a", "role-b"],
  candidateSetSha256,
  sandboxExecutable = "/usr/bin/sandbox-exec"
}) {
  if (!path.isAbsolute(repositoryRoot)) throw new Error("repositoryRoot must be absolute.");
  if (!Array.isArray(roleIds) || roleIds.length < 2 || new Set(roleIds).size !== roleIds.length) throw new Error("At least two unique role IDs are required.");
  if (roleIds.some((roleId) => !validRoleId(roleId))) throw new Error("Isolation role IDs must be opaque safe identifiers.");
  if (!/^[a-f0-9]{64}$/.test(candidateSetSha256 ?? "")) throw new Error("A valid candidate-set SHA-256 commitment is required.");
  await assertSeatbeltAvailable(sandboxExecutable);
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "mais-f2-r-seatbelt-"));
  const executionRoot = await realpath(temporaryRoot);
  let receipt;
  try {
    const runtimeDirectory = path.join(executionRoot, "runtime");
    const inputDirectory = path.join(executionRoot, "inputs");
    const outboxRoot = path.join(executionRoot, "outboxes");
    const protectedDirectory = path.join(executionRoot, "protected");
    await Promise.all([
      mkdir(runtimeDirectory, { mode: 0o700 }),
      mkdir(inputDirectory, { mode: 0o700 }),
      mkdir(outboxRoot, { mode: 0o700 }),
      mkdir(protectedDirectory, { mode: 0o700 })
    ]);
    const workerPath = path.join(runtimeDirectory, "isolation-probe-worker.mjs");
    await writeFile(workerPath, await readFile(probeWorkerSource), { mode: 0o500, flag: "wx" });
    const protectedCanaryPath = path.join(protectedDirectory, "synthetic-api-keys.docx");
    await writeFile(protectedCanaryPath, "synthetic-credential-canary-only\n", { mode: 0o600, flag: "wx" });
    const repositoryCanaryPath = path.join(repositoryRoot, "package.json");
    await access(repositoryCanaryPath, constants.R_OK);
    const nodeExecutable = await realpath(process.execPath);

    const rolePaths = new Map();
    for (const roleId of roleIds) {
      const ownOutbox = path.resolve(outboxRoot, roleId);
      if (!isInside(outboxRoot, ownOutbox)) throw new Error("Isolation role outbox escaped its assigned root.");
      const ownTemporaryDirectory = path.join(ownOutbox, "tmp");
      await mkdir(ownTemporaryDirectory, { recursive: true, mode: 0o700 });
      await chmod(ownOutbox, 0o700);
      await chmod(ownTemporaryDirectory, 0o700);
      rolePaths.set(roleId, { ownOutbox, ownTemporaryDirectory, inputPath: path.join(inputDirectory, `${roleId}.json`) });
    }

    for (let index = 0; index < roleIds.length; index += 1) {
      const roleId = roleIds[index];
      const siblingRoleId = roleIds[(index + 1) % roleIds.length];
      const paths = rolePaths.get(roleId);
      const payload = {
        roleId,
        protocolId: PROTOCOL_ID,
        protocolVersion: PROTOCOL_VERSION,
        syntheticPublicInput: { questionId: "synthetic-q1", prompt: "2 + 3", answer: "5" },
        protectedCanaryPath,
        siblingOutbox: rolePaths.get(siblingRoleId).ownOutbox,
        repositoryCanaryPath
      };
      await writeFile(paths.inputPath, `${JSON.stringify(payload, null, 2)}\n`, { mode: 0o400, flag: "wx" });
      await chmod(paths.inputPath, 0o400);
    }

    const roles = [];
    for (const roleId of roleIds) {
      const paths = rolePaths.get(roleId);
      const inputSha256Before = sha256(await readFile(paths.inputPath));
      const profile = buildSeatbeltProfile({ nodeExecutable, runtimeDirectory, inputPath: paths.inputPath, ownOutbox: paths.ownOutbox });
      const processResult = await runBoundedProcess({
        executable: sandboxExecutable,
        args: ["-p", profile, nodeExecutable, workerPath, paths.inputPath, paths.ownOutbox],
        options: {
          cwd: runtimeDirectory,
          env: sanitizeIsolationEnvironment(process.env, { roleId, temporaryDirectory: paths.ownTemporaryDirectory })
        },
        timeoutMilliseconds: 10_000,
        terminationGraceMilliseconds: 250,
        label: `Isolation probe ${roleId}`
      });
      let workerResult;
      try {
        workerResult = JSON.parse(await readFile(path.join(paths.ownOutbox, "probe-result.json"), "utf8"));
      } catch (error) {
        throw new Error(`Isolation probe ${roleId} produced no readable receipt (exit=${processResult.code}, signal=${processResult.signal}, stderr=${processResult.stderr.trim()}): ${error.message}`);
      }
      if (processResult.code !== 0) {
        throw new Error(`Isolation probe ${roleId} failed (exit=${processResult.code}, signal=${processResult.signal}, stderr=${processResult.stderr.trim()}): ${JSON.stringify(workerResult)}`);
      }
      const inputSha256After = sha256(await readFile(paths.inputPath));
      roles.push({
        ...workerResult,
        inputSha256Before,
        inputSha256After,
        exitCode: processResult.code,
        profileSha256: sha256(profile)
      });
    }

    const runtimeInventory = (await readdir(runtimeDirectory)).sort();
    const allRoleChecksPass = roles.every((role) => [
      role.inputReadAllowed,
      role.ownOutboxWriteAllowed,
      role.protectedCanaryReadDenied,
      role.protectedCanaryMetadataDenied,
      role.protectedSymlinkEscapeDenied,
      role.inputWriteDenied,
      role.inputChmodDenied,
      role.siblingOutboxWriteDenied,
      role.siblingSymlinkWriteDenied,
      role.repositoryReadDenied,
      role.networkDenied,
      role.credentialEnvironmentAbsent,
      role.childProcessSpawnDenied
    ].every(Boolean) && role.inputSha256Before === role.inputSha256After && role.exitCode === 0);
    if (!allRoleChecksPass || runtimeInventory.includes("node_modules")) throw new Error("Isolation matrix did not satisfy every deny-default invariant.");
    const receiptBody = {
      protocolId: PROTOCOL_ID,
      protocolVersion: PROTOCOL_VERSION,
      sourceBaseline: SOURCE_BASELINE,
      candidateSetSha256,
      status: "isolation-probe-pass",
      enforcementMode: "macos-seatbelt-deny-default",
      sameUidAdversaryModel: true,
      cleanEnvironmentAllowlist: ["LANG", "LC_ALL", "MAIS_ROLE_ID", "NO_PROXY", "TMPDIR"],
      runtimeInventory,
      browserEstimandExcluded: true,
      liveProviderAuthorized: false,
      formalExecutionAuthorized: false,
      productionAuthorized: false,
      roles,
      interpretation: "Synthetic same-UID enforcement proof only. Each role can read one input and write one outbox; protected, sibling, repository, network, and credential-environment probes are denied."
    };
    receipt = { ...receiptBody, receiptSha256: sha256(JSON.stringify(receiptBody)) };
  } finally {
    await rm(executionRoot, { recursive: true, force: true });
  }
  return receipt;
}
