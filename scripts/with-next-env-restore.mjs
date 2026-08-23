import { execFileSync, spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  chmodSync,
  closeSync,
  constants as fsConstants,
  fstatSync,
  fsyncSync,
  futimesSync,
  linkSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync
} from "node:fs";
import { constants as osConstants } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const forwardedSignals = ["SIGINT", "SIGTERM", "SIGHUP"];
const forceKillDelayMs = 5_000;
const processGroupExitTimeoutMs = 10_000;
const processGroupPollMs = 25;
const nextEnvLockPollMs = 25;
const nextEnvLockTimeoutMs = 30_000;
const nextEnvLockFileName = "next-env-restore.lock";
const nextEnvRecoveryLockFileName = `${nextEnvLockFileName}.recovery`;
const nextEnvLockBaseDirectoryName = "mais-next-env-restore-locks";
const nextEnvTokenPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/u;
const nextEnvPublishFilePattern = /^\.next-env-restore\.lock\.publish-([1-9]\d*)-([a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})$/u;
const nextEnvLeaseFilePattern = /^\.next-env-restore\.lock\.lease-([1-9]\d*)-([a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})$/u;
const nextEnvSnapshotFilePattern = /^\.next-env-restore\.lock\.snapshot-([1-9]\d*)-([a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})$/u;
const nextEnvChildFilePattern = /^\.next-env-restore\.lock\.child-([1-9]\d*)-([a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})$/u;
const nextEnvStatePublishFilePattern = /^\.next-env-restore\.lock\.(snapshot|child)\.publish-([1-9]\d*)-([a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})-([a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})$/u;
const nextEnvLeaseHeartbeatMs = 250;
const nextEnvLeaseClockSkewMs = 5_000;
const maxLockMetadataBytes = 4_096;
const maxRecoveryStateBytes = 256 * 1_024;
const processBirthIdentityPattern = /^sha256:[a-f0-9]{64}$/u;

function testLeaseTimeoutMs() {
  const raw = process.env.MAIS_NEXT_ENV_RESTORE_TEST_LEASE_TIMEOUT_MS;
  if (raw === undefined) return 10_000;
  if (!/^\d+$/u.test(raw)) {
    throw new Error("MAIS_NEXT_ENV_RESTORE_TEST_LEASE_TIMEOUT_MS must be a positive integer.");
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 100 || value > 10_000) {
    throw new Error("MAIS_NEXT_ENV_RESTORE_TEST_LEASE_TIMEOUT_MS must be between 100 and 10000.");
  }
  return value;
}

const nextEnvLeaseTimeoutMs = testLeaseTimeoutMs();

function assertSupportedPlatform() {
  if (process.platform === "win32") {
    throw new Error(
      "with-next-env-restore requires POSIX process groups; Windows execution is intentionally unsupported."
    );
  }
  if (!fsConstants.O_NOFOLLOW || !fsConstants.O_NONBLOCK) {
    throw new Error("with-next-env-restore requires POSIX O_NOFOLLOW and O_NONBLOCK lock reads.");
  }
  if (process.platform !== "linux" && process.platform !== "darwin") {
    throw new Error("with-next-env-restore currently supports process-birth identity on Linux and macOS only.");
  }
}

function processBirthIdentity(processId) {
  let rawIdentity;
  try {
    if (process.platform === "linux") {
      const statText = readFileSync(`/proc/${processId}/stat`, "utf8");
      const commandEnd = statText.lastIndexOf(")");
      if (commandEnd < 0) throw new Error("Malformed Linux process stat record.");
      const fieldsAfterCommand = statText.slice(commandEnd + 2).trim().split(/\s+/u);
      const startTimeTicks = fieldsAfterCommand[19];
      if (!/^\d+$/u.test(startTimeTicks ?? "")) {
        throw new Error("Linux process stat record has no start-time identity.");
      }
      rawIdentity = `linux:${processId}:${startTimeTicks}`;
    } else if (process.platform === "darwin") {
      const startedAt = execFileSync(
        "/bin/ps",
        ["-o", "lstart=", "-p", String(processId)],
        {
          encoding: "utf8",
          env: { LC_ALL: "C", LANG: "C", LANGUAGE: "C", TZ: "UTC" },
          maxBuffer: 1_024,
          timeout: 1_000
        }
      ).trim();
      if (!startedAt || startedAt.length > 128) {
        throw new Error("macOS process record has no bounded start-time identity.");
      }
      rawIdentity = `darwin:${processId}:${startedAt}`;
    } else {
      throw new Error("Unsupported process-birth identity platform.");
    }
  } catch (error) {
    if (!processIsAlive(processId)) return null;
    throw new Error(`Could not establish process-birth identity for PID ${processId}.`, { cause: error });
  }
  return `sha256:${createHash("sha256").update(rawIdentity).digest("hex")}`;
}

function processGroupIsAlive(processGroupId) {
  try {
    process.kill(-processGroupId, 0);
    return true;
  } catch (error) {
    if (error?.code === "ESRCH") return false;
    if (error?.code === "EPERM") return true;
    throw error;
  }
}

function signalProcessGroup(processGroupId, signal) {
  try {
    process.kill(-processGroupId, signal);
  } catch (error) {
    if (error?.code !== "ESRCH") throw error;
  }
}

async function waitForProcessGroupExit(processGroupId) {
  const deadline = Date.now() + processGroupExitTimeoutMs;
  while (processGroupIsAlive(processGroupId)) {
    if (Date.now() >= deadline) {
      throw new Error(`Child process group ${processGroupId} did not terminate safely.`);
    }
    await new Promise((resolve) => setTimeout(resolve, processGroupPollMs));
  }
}

function assertPrivateLockDirectory(directoryPath, label, uid) {
  const stat = lstatSync(directoryPath);
  if (!stat.isDirectory() || stat.isSymbolicLink() || realpathSync(directoryPath) !== directoryPath) {
    throw new Error(`Refusing next-env locking through a non-canonical ${label} directory.`);
  }
  if (stat.uid !== uid) {
    throw new Error(`Refusing next-env locking through a ${label} directory owned by another user.`);
  }
  if ((stat.mode & 0o777) !== 0o700) {
    throw new Error(`Refusing next-env locking through a non-private ${label} directory.`);
  }
}

function nextEnvLockPaths(cwd) {
  const canonicalCwd = realpathSync(path.resolve(cwd));
  const uid = process.getuid?.();
  if (!Number.isSafeInteger(uid) || uid < 0) {
    throw new Error("with-next-env-restore requires a numeric POSIX uid for lock ownership.");
  }
  // The lock namespace must be identical for every process targeting this
  // canonical worktree. os.tmpdir() is environment-sensitive (TMPDIR/TMP/TEMP)
  // and would allow concurrent snapshot owners, so supported POSIX platforms
  // deliberately use the canonical system /tmp namespace instead.
  const canonicalTempRoot = realpathSync("/tmp");
  const lockBase = path.join(canonicalTempRoot, `${nextEnvLockBaseDirectoryName}-uid-${uid}`);
  mkdirSync(lockBase, { recursive: true, mode: 0o700 });
  assertPrivateLockDirectory(lockBase, "OS-temp lock root", uid);

  const worktreeDigest = createHash("sha256").update(canonicalCwd).digest("hex");
  const lockRoot = path.join(lockBase, worktreeDigest);
  mkdirSync(lockRoot, { recursive: true, mode: 0o700 });
  assertPrivateLockDirectory(lockRoot, "worktree lock root", uid);
  return {
    canonicalCwd,
    lockRoot,
    lockPath: path.join(lockRoot, nextEnvLockFileName),
    recoveryLockPath: path.join(lockRoot, nextEnvRecoveryLockFileName)
  };
}

function leaseNameFor(pid, token) {
  return `.${nextEnvLockFileName}.lease-${pid}-${token}`;
}

function publishNameFor(pid, token) {
  return `.${nextEnvLockFileName}.publish-${pid}-${token}`;
}

function snapshotNameFor(pid, token) {
  return `.${nextEnvLockFileName}.snapshot-${pid}-${token}`;
}

function childNameFor(pid, token) {
  return `.${nextEnvLockFileName}.child-${pid}-${token}`;
}

function statePublishNameFor(kind, pid, token) {
  return `.${nextEnvLockFileName}.${kind}.publish-${pid}-${token}-${randomUUID()}`;
}

function readBoundedText(descriptor, maxBytes, label) {
  const buffer = Buffer.alloc(maxBytes + 1);
  let offset = 0;
  while (offset < buffer.length) {
    const bytesRead = readSync(descriptor, buffer, offset, buffer.length - offset, null);
    if (bytesRead === 0) break;
    offset += bytesRead;
  }
  if (offset > maxBytes) {
    throw new Error(`Refusing next-env ${label} larger than ${maxBytes} bytes.`);
  }
  return buffer.subarray(0, offset).toString("utf8");
}

function readPrivateNode(nodePath, { label, maxBytes, minLinks = 1, maxLinks = 1 }) {
  let descriptor;
  try {
    descriptor = openSync(
      nodePath,
      fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW | fsConstants.O_NONBLOCK
    );
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw new Error(`Refusing unsafe next-env ${label} node: ${nodePath}`, { cause: error });
  }

  try {
    const stat = fstatSync(descriptor);
    if (!stat.isFile() || stat.nlink < minLinks || stat.nlink > maxLinks || stat.size > maxBytes) {
      throw new Error(`Refusing unsafe next-env ${label} node: ${nodePath}`);
    }
    if (stat.uid !== process.getuid()) {
      throw new Error(`Refusing next-env ${label} owned by another user: ${nodePath}`);
    }
    if ((stat.mode & 0o077) !== 0) {
      throw new Error(`Refusing non-private next-env ${label}: ${nodePath}`);
    }
    return { stat, text: readBoundedText(descriptor, maxBytes, label) };
  } finally {
    closeSync(descriptor);
  }
}

function readLockNode(lockPath) {
  return readPrivateNode(lockPath, {
    label: "lock",
    maxBytes: maxLockMetadataBytes,
    minLinks: 1,
    maxLinks: 2
  });
}

function readRecoveryStateNode(statePath) {
  return readPrivateNode(statePath, {
    label: "recovery state",
    maxBytes: maxRecoveryStateBytes
  });
}

function parseValidatedLockNode(node, lockPath, canonicalCwd) {
  let metadata;
  try {
    metadata = JSON.parse(node.text);
  } catch (error) {
    throw new Error(`Refusing malformed next-env lock metadata: ${lockPath}`, { cause: error });
  }
  const hasValidCommonFields = (
    (metadata?.version === 1 || metadata?.version === 2) &&
    Number.isSafeInteger(metadata.pid) &&
    metadata.pid > 0 &&
    typeof metadata.token === "string" &&
    nextEnvTokenPattern.test(metadata.token) &&
    metadata.leaseName === leaseNameFor(metadata.pid, metadata.token) &&
    typeof metadata.leaseDevice === "string" &&
    /^\d+$/u.test(metadata.leaseDevice) &&
    typeof metadata.leaseInode === "string" &&
    /^\d+$/u.test(metadata.leaseInode) &&
    metadata.canonicalCwd === canonicalCwd &&
    typeof metadata.createdAt === "string" &&
    Number.isFinite(Date.parse(metadata.createdAt))
  );
  const hasValidVersionTwoFields = metadata?.version !== 2 || (
    (metadata.role === "main" || metadata.role === "recovery") &&
    (
      metadata.role === "recovery" || (
        metadata.snapshotName === snapshotNameFor(metadata.pid, metadata.token) &&
        metadata.childName === childNameFor(metadata.pid, metadata.token)
      )
    )
  );
  if (!hasValidCommonFields || !hasValidVersionTwoFields) {
    throw new Error(`Refusing invalid next-env lock metadata: ${lockPath}`);
  }
  return { metadata, stat: node.stat };
}

function readValidatedLock(lockPath, canonicalCwd) {
  const node = readLockNode(lockPath);
  return node ? parseValidatedLockNode(node, lockPath, canonicalCwd) : null;
}

function processIsAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error?.code === "ESRCH") return false;
    if (error?.code === "EPERM") return true;
    throw error;
  }
}

function leaseNodeIsFresh(node) {
  const ageMs = Date.now() - node.stat.mtimeMs;
  if (ageMs < -nextEnvLeaseClockSkewMs) {
    throw new Error("Refusing a next-env lease timestamp too far in the future.");
  }
  return ageMs <= nextEnvLeaseTimeoutMs;
}

function lockMetadataIsWithinLeaseGrace(metadata) {
  const ageMs = Date.now() - Date.parse(metadata.createdAt);
  if (ageMs < -nextEnvLeaseClockSkewMs) {
    throw new Error("Refusing a next-env lock timestamp too far in the future.");
  }
  return ageMs <= nextEnvLeaseTimeoutMs;
}

function validateLeaseNode(metadata, leasePath, node) {
  if (
    node.stat.nlink !== 1 ||
    node.text !== `${metadata.token}\n` ||
    String(node.stat.dev) !== metadata.leaseDevice ||
    String(node.stat.ino) !== metadata.leaseInode
  ) {
    throw new Error(`Refusing invalid next-env lease identity: ${leasePath}`);
  }
  return node;
}

function readValidatedLease(metadata, lockRoot) {
  const expectedLeaseName = leaseNameFor(metadata.pid, metadata.token);
  if (metadata.leaseName !== expectedLeaseName) {
    throw new Error("Refusing a next-env lock with a non-canonical lease name.");
  }
  const leasePath = path.join(lockRoot, expectedLeaseName);
  const node = readLockNode(leasePath);
  if (!node) return null;
  return { leasePath, node: validateLeaseNode(metadata, leasePath, node) };
}

function readNamedLease(lockRoot, pid, token) {
  const leasePath = path.join(lockRoot, leaseNameFor(pid, token));
  const node = readLockNode(leasePath);
  if (!node) return null;
  if (node.stat.nlink !== 1 || node.text !== `${token}\n`) {
    throw new Error(`Refusing invalid next-env lease node: ${leasePath}`);
  }
  return { leasePath, node };
}

function lockOwnerIsAlive(metadata, lockRoot) {
  const pidIsAlive = processIsAlive(metadata.pid);
  const lease = readValidatedLease(metadata, lockRoot);

  // A just-published lock gets a bounded grace if its lease path disappears in
  // a publication race. After that grace, the lease is the process-birth
  // identity: a recycled PID cannot keep an abandoned lock alive indefinitely.
  if (!lease) return pidIsAlive && lockMetadataIsWithinLeaseGrace(metadata);
  if (!pidIsAlive) return false;
  return leaseNodeIsFresh(lease.node);
}

function sameInode(left, right) {
  return left.dev === right.dev && left.ino === right.ino;
}

// Node does not expose unlinkat-by-descriptor. The remaining lstat/unlink pair is
// confined to a random, fixed-name claim inside a 0700 same-uid directory; all
// shared lock paths are atomically renamed away before this helper is used.
function unlinkPrivateClaim(claimPath, expectedStat) {
  let current;
  try {
    current = lstatSync(claimPath);
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
  if (!sameInode(current, expectedStat)) return false;
  try {
    unlinkSync(claimPath);
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
  return true;
}

function discardOrphanClaim(claimPath, expectedStat, label) {
  if (unlinkPrivateClaim(claimPath, expectedStat)) return;
  try {
    lstatSync(claimPath);
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
  throw new Error(`${label} inode changed before cleanup: ${claimPath}`);
}

function createOwnedLease(lockRoot, token) {
  const leaseName = leaseNameFor(process.pid, token);
  const leasePath = path.join(lockRoot, leaseName);
  let descriptor;
  let stat;
  try {
    descriptor = openSync(leasePath, "wx", 0o600);
    writeFileSync(descriptor, `${token}\n`, "utf8");
    fsyncSync(descriptor);
    stat = fstatSync(descriptor);
    let reportHeartbeatFailure;
    const heartbeatFailure = new Promise((resolve) => {
      reportHeartbeatFailure = resolve;
    });
    return {
      leaseName,
      leasePath,
      descriptor,
      stat,
      heartbeat: null,
      heartbeatError: null,
      heartbeatFailure,
      reportHeartbeatFailure
    };
  } catch (error) {
    if (descriptor !== undefined) closeSync(descriptor);
    if (stat) unlinkPrivateClaim(leasePath, stat);
    throw error;
  }
}

function startOwnedLeaseHeartbeat(lease) {
  lease.heartbeat = setInterval(() => {
    try {
      const now = new Date();
      futimesSync(lease.descriptor, now, now);
    } catch (error) {
      lease.heartbeatError ??= error;
      lease.reportHeartbeatFailure?.(error);
      lease.reportHeartbeatFailure = null;
      clearInterval(lease.heartbeat);
      lease.heartbeat = null;
    }
  }, nextEnvLeaseHeartbeatMs);
  lease.heartbeat.unref();
}

function stopOwnedLease(lock, removeLease = true) {
  const lease = lock?.lease;
  if (!lease) return true;
  if (lease.heartbeat) {
    clearInterval(lease.heartbeat);
    lease.heartbeat = null;
  }
  if (lease.descriptor !== undefined) {
    closeSync(lease.descriptor);
    lease.descriptor = undefined;
  }
  return removeLease ? unlinkPrivateClaim(lease.leasePath, lease.stat) : true;
}

function removeOwnedLeaseBeforeMain(lock) {
  const lease = lock?.lease;
  if (!lease || stopOwnedLease(lock)) return;
  try {
    lstatSync(lease.leasePath);
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
  throw new Error("Owned next-env lease changed before main-lock release.");
}

function createOwnedLock(lockPath, canonicalCwd, role) {
  const lockRoot = path.dirname(lockPath);
  const token = randomUUID();
  const lease = createOwnedLease(lockRoot, token);
  const publishName = publishNameFor(process.pid, token);
  const publishPath = path.join(lockRoot, publishName);
  const metadataRecord = {
    version: 2,
    role,
    pid: process.pid,
    token,
    leaseName: lease.leaseName,
    leaseDevice: String(lease.stat.dev),
    leaseInode: String(lease.stat.ino),
    canonicalCwd,
    createdAt: new Date().toISOString()
  };
  if (role === "main") {
    metadataRecord.snapshotName = snapshotNameFor(process.pid, token);
    metadataRecord.childName = childNameFor(process.pid, token);
  }
  const metadata = JSON.stringify(metadataRecord);
  let descriptor;
  let openedStat;
  try {
    descriptor = openSync(publishPath, "wx", 0o600);
    openedStat = fstatSync(descriptor);
    if (process.env.MAIS_NEXT_ENV_RESTORE_TEST_CRASH_AFTER_TEMP_OPEN === "1") {
      process.kill(process.pid, "SIGKILL");
    }
    writeFileSync(descriptor, metadata, "utf8");
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = undefined;
    linkSync(publishPath, lockPath);
    if (!unlinkPrivateClaim(publishPath, openedStat)) {
      throw new Error("Next-env publish inode changed before temporary-link cleanup.");
    }
    const lock = { lockPath, canonicalCwd, token, stat: openedStat, lease, metadata: metadataRecord };
    startOwnedLeaseHeartbeat(lease);
    return lock;
  } catch (error) {
    if (descriptor !== undefined) closeSync(descriptor);
    if (openedStat) unlinkPrivateClaim(publishPath, openedStat);
    stopOwnedLease({ lease });
    throw error;
  }
}

function publishOwnedRecoveryState(lock, kind, record) {
  if (lock.metadata?.version !== 2 || lock.metadata.role !== "main") {
    throw new Error("Only a version-two main lock may publish next-env recovery state.");
  }
  const finalName = kind === "snapshot" ? lock.metadata.snapshotName : lock.metadata.childName;
  const finalPath = path.join(lock.lockRoot, finalName);
  const publishPath = path.join(
    lock.lockRoot,
    statePublishNameFor(kind, process.pid, lock.token)
  );
  const contents = `${JSON.stringify(record)}\n`;
  if (Buffer.byteLength(contents) > maxRecoveryStateBytes) {
    throw new Error(`Refusing next-env ${kind} recovery state larger than ${maxRecoveryStateBytes} bytes.`);
  }

  let descriptor;
  let openedStat;
  try {
    descriptor = openSync(publishPath, "wx", 0o600);
    openedStat = fstatSync(descriptor);
    if (
      kind === "snapshot"
      && process.env.MAIS_NEXT_ENV_RESTORE_TEST_CRASH_AFTER_SNAPSHOT_TEMP_OPEN === "1"
    ) {
      process.kill(process.pid, "SIGKILL");
    }
    writeFileSync(descriptor, contents, "utf8");
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = undefined;
    linkSync(publishPath, finalPath);
    if (!unlinkPrivateClaim(publishPath, openedStat)) {
      throw new Error(`Next-env ${kind} publish inode changed before temporary-link cleanup.`);
    }
    return { kind, path: finalPath, stat: openedStat, record };
  } catch (error) {
    if (descriptor !== undefined) closeSync(descriptor);
    if (openedStat) unlinkPrivateClaim(publishPath, openedStat);
    throw error;
  }
}

function persistSnapshotRecoveryState(lock, snapshot) {
  const record = {
    version: 1,
    kind: "snapshot",
    token: lock.token,
    canonicalCwd: lock.canonicalCwd,
    existed: snapshot.existed
  };
  if (snapshot.existed) {
    record.contentsBase64 = snapshot.contents.toString("base64");
    record.mode = snapshot.mode;
  }
  return publishOwnedRecoveryState(lock, "snapshot", record);
}

function persistChildRecoveryState(lock, processGroupId, processBirthIdentityValue) {
  return publishOwnedRecoveryState(lock, "child", {
    version: 1,
    kind: "child",
    token: lock.token,
    canonicalCwd: lock.canonicalCwd,
    processGroupId,
    processBirthIdentity: processBirthIdentityValue,
    createdAt: new Date().toISOString()
  });
}

function parseValidatedRecoveryState(node, statePath, metadata, expectedKind) {
  let record;
  try {
    record = JSON.parse(node.text);
  } catch (error) {
    throw new Error(`Refusing malformed next-env ${expectedKind} recovery state: ${statePath}`, { cause: error });
  }
  const commonIsValid = (
    record?.version === 1 &&
    record.kind === expectedKind &&
    record.token === metadata.token &&
    record.canonicalCwd === metadata.canonicalCwd
  );
  if (!commonIsValid) {
    throw new Error(`Refusing invalid next-env ${expectedKind} recovery state: ${statePath}`);
  }

  if (expectedKind === "snapshot") {
    const validAbsentSnapshot = record.existed === false
      && record.contentsBase64 === undefined
      && record.mode === undefined;
    const validExistingSnapshot = record.existed === true
      && typeof record.contentsBase64 === "string"
      && /^[A-Za-z0-9+/]*={0,2}$/u.test(record.contentsBase64)
      && Number.isSafeInteger(record.mode)
      && record.mode >= 0
      && record.mode <= 0o777;
    if (!validAbsentSnapshot && !validExistingSnapshot) {
      throw new Error(`Refusing invalid next-env snapshot recovery state: ${statePath}`);
    }
    if (validExistingSnapshot) {
      const contents = Buffer.from(record.contentsBase64, "base64");
      if (contents.toString("base64") !== record.contentsBase64) {
        throw new Error(`Refusing non-canonical next-env snapshot recovery state: ${statePath}`);
      }
      record.snapshot = { existed: true, contents, mode: record.mode };
    } else {
      record.snapshot = { existed: false };
    }
  } else if (
    !Number.isSafeInteger(record.processGroupId)
    || record.processGroupId <= 0
    || typeof record.processBirthIdentity !== "string"
    || !processBirthIdentityPattern.test(record.processBirthIdentity)
    || typeof record.createdAt !== "string"
    || !Number.isFinite(Date.parse(record.createdAt))
  ) {
    throw new Error(`Refusing invalid next-env child recovery state: ${statePath}`);
  }
  return { node, record };
}

function recoveryStatePath(metadata, lockRoot, kind) {
  if (metadata.version !== 2 || metadata.role !== "main") return null;
  const expectedName = kind === "snapshot"
    ? snapshotNameFor(metadata.pid, metadata.token)
    : childNameFor(metadata.pid, metadata.token);
  const recordedName = kind === "snapshot" ? metadata.snapshotName : metadata.childName;
  if (recordedName !== expectedName) {
    throw new Error(`Refusing a next-env lock with a non-canonical ${kind} recovery name.`);
  }
  return path.join(lockRoot, expectedName);
}

function readValidatedRecoveryState(metadata, lockRoot, kind) {
  const statePath = recoveryStatePath(metadata, lockRoot, kind);
  if (!statePath) return null;
  const node = readRecoveryStateNode(statePath);
  if (!node) return null;
  return { statePath, ...parseValidatedRecoveryState(node, statePath, metadata, kind) };
}

function recordedChildGroupRequiresBarrier(childState) {
  if (!processGroupIsAlive(childState.record.processGroupId)) return false;
  let currentBirthIdentity;
  try {
    currentBirthIdentity = processBirthIdentity(childState.record.processGroupId);
  } catch {
    // A live group whose leader identity cannot be read is dangerous, never
    // evidence that mutation has stopped. Preserve the canonical main lock.
    return processGroupIsAlive(childState.record.processGroupId);
  }
  if (currentBirthIdentity === null) {
    // The leader can exit while descendants remain in its process group. The
    // numeric PGID is then identity-unknown, so heartbeat age must not convert
    // a still-live mutation group into a stale/recoverable one.
    return processGroupIsAlive(childState.record.processGroupId);
  }
  // An exact birth identity is the original detached gate and remains a hard
  // barrier even if its heartbeat is stale. A different identity proves that
  // the numeric PID/PGID was recycled; never signal that unrelated group.
  return currentBirthIdentity === childState.record.processBirthIdentity;
}

function cleanupOrphanPublishFiles(paths) {
  const uid = process.getuid();
  for (const name of readdirSync(paths.lockRoot)) {
    const match = nextEnvPublishFilePattern.exec(name);
    if (!match) continue;
    const ownerPid = Number(match[1]);
    const token = match[2];
    if (!Number.isSafeInteger(ownerPid) || ownerPid <= 0 || !nextEnvTokenPattern.test(token)) {
      continue;
    }

    const lease = readNamedLease(paths.lockRoot, ownerPid, token);
    if (processIsAlive(ownerPid) && (!lease || leaseNodeIsFresh(lease.node))) continue;

    const publishPath = path.join(paths.lockRoot, name);
    let stat;
    try {
      stat = lstatSync(publishPath);
    } catch (error) {
      if (error?.code === "ENOENT") continue;
      throw error;
    }
    if (
      !stat.isFile()
      || stat.isSymbolicLink()
      || stat.nlink < 1
      || stat.nlink > 2
      || stat.uid !== uid
      || (stat.mode & 0o077) !== 0
    ) {
      throw new Error(`Refusing unsafe orphan next-env publish node: ${publishPath}`);
    }
    discardOrphanClaim(publishPath, stat, "Orphan next-env publish");
    if (stat.nlink === 1 && lease) {
      discardOrphanClaim(lease.leasePath, lease.node.stat, "Orphan next-env lease");
    }
  }
}

function cleanupOrphanStatePublishFiles(paths) {
  const uid = process.getuid();
  for (const name of readdirSync(paths.lockRoot)) {
    const match = nextEnvStatePublishFilePattern.exec(name);
    if (!match) continue;
    const ownerPid = Number(match[2]);
    const token = match[3];
    if (!Number.isSafeInteger(ownerPid) || ownerPid <= 0 || !nextEnvTokenPattern.test(token)) {
      continue;
    }
    const lease = readNamedLease(paths.lockRoot, ownerPid, token);
    if (processIsAlive(ownerPid) && (!lease || leaseNodeIsFresh(lease.node))) continue;

    const publishPath = path.join(paths.lockRoot, name);
    let stat;
    try {
      stat = lstatSync(publishPath);
    } catch (error) {
      if (error?.code === "ENOENT") continue;
      throw error;
    }
    if (
      !stat.isFile()
      || stat.isSymbolicLink()
      || stat.nlink < 1
      || stat.nlink > 2
      || stat.uid !== uid
      || (stat.mode & 0o077) !== 0
      || stat.size > maxRecoveryStateBytes
    ) {
      throw new Error(`Refusing unsafe orphan next-env state publish node: ${publishPath}`);
    }
    discardOrphanClaim(publishPath, stat, "Orphan next-env state publish");
  }
}

function cleanupOrphanLeaseFiles(paths) {
  for (const name of readdirSync(paths.lockRoot)) {
    const match = nextEnvLeaseFilePattern.exec(name);
    if (!match) continue;
    const ownerPid = Number(match[1]);
    const token = match[2];
    if (!Number.isSafeInteger(ownerPid) || ownerPid <= 0 || !nextEnvTokenPattern.test(token)) {
      continue;
    }
    const lease = readNamedLease(paths.lockRoot, ownerPid, token);
    if (!lease || (processIsAlive(ownerPid) && leaseNodeIsFresh(lease.node))) continue;
    discardOrphanClaim(lease.leasePath, lease.node.stat, "Orphan next-env lease");
  }
}

function quarantineLockPath(lockPath, purpose) {
  const quarantinePath = path.join(
    path.dirname(lockPath),
    `.${path.basename(lockPath)}.quarantine-${purpose}-${process.pid}-${randomUUID()}`
  );
  try {
    renameSync(lockPath, quarantinePath);
    return quarantinePath;
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

function restorePrivateClaim(claim) {
  try {
    linkSync(claim.quarantinePath, claim.lockPath);
  } catch (error) {
    if (error?.code === "EEXIST") return false;
    throw error;
  }
  if (!unlinkPrivateClaim(claim.quarantinePath, claim.node.stat)) {
    throw new Error("Quarantined next-env lock changed before it could be restored.");
  }
  return true;
}

function quarantineValidatedLock(lockPath, canonicalCwd, purpose) {
  const quarantinePath = quarantineLockPath(lockPath, purpose);
  if (!quarantinePath) return null;
  let node;
  try {
    node = readLockNode(quarantinePath);
    if (!node) throw new Error("Quarantined next-env lock disappeared before validation.");
    const validated = parseValidatedLockNode(node, quarantinePath, canonicalCwd);
    return { lockPath, quarantinePath, node, ...validated };
  } catch (error) {
    if (node) restorePrivateClaim({ lockPath, quarantinePath, node });
    throw error;
  }
}

function quarantineValidatedRecoveryState(metadata, lockRoot, kind, purpose) {
  const observed = readValidatedRecoveryState(metadata, lockRoot, kind);
  if (!observed) return null;
  const quarantinePath = quarantineLockPath(observed.statePath, `${purpose}-${kind}`);
  if (!quarantinePath) return null;
  let node;
  const claim = {
    lockPath: observed.statePath,
    quarantinePath,
    node: null,
    record: null
  };
  try {
    node = readRecoveryStateNode(quarantinePath);
    if (!node) throw new Error(`Quarantined next-env ${kind} recovery state disappeared.`);
    claim.node = node;
    const validated = parseValidatedRecoveryState(node, quarantinePath, metadata, kind);
    claim.record = validated.record;
    if (!sameInode(node.stat, observed.node.stat)) {
      throw new Error(`Next-env ${kind} recovery inode changed before quarantine validation.`);
    }
    return claim;
  } catch (error) {
    if (node) restorePrivateClaim(claim);
    throw error;
  }
}

function quarantineStaleLease(metadata, lockRoot, purpose) {
  const observed = readValidatedLease(metadata, lockRoot);
  if (!observed) {
    return {
      live: processIsAlive(metadata.pid) && lockMetadataIsWithinLeaseGrace(metadata),
      claim: null
    };
  }
  if (processIsAlive(metadata.pid) && leaseNodeIsFresh(observed.node)) {
    return { live: true, claim: null };
  }

  const quarantinePath = quarantineLockPath(observed.leasePath, purpose);
  if (!quarantinePath) {
    return {
      live: processIsAlive(metadata.pid) && lockMetadataIsWithinLeaseGrace(metadata),
      claim: null
    };
  }
  let node;
  const claim = {
    lockPath: observed.leasePath,
    quarantinePath,
    node: null
  };
  try {
    node = readLockNode(quarantinePath);
    if (!node) throw new Error("Quarantined next-env lease disappeared before validation.");
    claim.node = node;
    validateLeaseNode(metadata, quarantinePath, node);
    if (!sameInode(node.stat, observed.node.stat)) {
      throw new Error("Next-env lease inode changed before quarantine validation.");
    }
    if (processIsAlive(metadata.pid) && leaseNodeIsFresh(node)) {
      restorePrivateClaim(claim);
      return { live: true, claim: null };
    }
    return { live: false, claim };
  } catch (error) {
    if (node) restorePrivateClaim(claim);
    throw error;
  }
}

function quarantineOwnedLock(lock, purpose) {
  const claim = quarantineValidatedLock(lock.lockPath, lock.canonicalCwd, purpose);
  if (!claim) throw new Error("Owned next-env lock disappeared before release.");
  if (!sameInode(claim.stat, lock.stat) || claim.metadata.token !== lock.token) {
    restorePrivateClaim(claim);
    throw new Error("Refusing to release a next-env lock owned by another process.");
  }
  return claim;
}

function quarantineOwnedRecoveryState(lock, state, purpose) {
  if (!state) return null;
  const claim = quarantineValidatedRecoveryState(
    lock.metadata,
    lock.lockRoot,
    state.kind,
    purpose
  );
  if (!claim) throw new Error(`Owned next-env ${state.kind} recovery state disappeared before release.`);
  if (!sameInode(claim.node.stat, state.stat) || claim.record.token !== lock.token) {
    restorePrivateClaim(claim);
    throw new Error(`Refusing to release next-env ${state.kind} state owned by another process.`);
  }
  return claim;
}

function discardPrivateClaim(claim) {
  if (!unlinkPrivateClaim(claim.quarantinePath, claim.node.stat)) {
    throw new Error("Quarantined next-env lock changed before it could be removed.");
  }
}

function releaseOwnedLockDirect(lock, purpose = "direct-release") {
  try {
    const claim = quarantineOwnedLock(lock, purpose);
    discardPrivateClaim(claim);
  } finally {
    stopOwnedLease(lock);
  }
}

function discardStaleLockClaim(claim, lockRoot, purpose) {
  let leaseResult;
  let lockDiscarded = false;
  let leaseDiscarded = false;
  try {
    leaseResult = quarantineStaleLease(claim.metadata, lockRoot, purpose);
    if (leaseResult.live) {
      restorePrivateClaim(claim);
      return false;
    }
    discardPrivateClaim(claim);
    lockDiscarded = true;
    if (leaseResult.claim) {
      discardPrivateClaim(leaseResult.claim);
      leaseDiscarded = true;
    }
    return true;
  } catch (error) {
    if (leaseResult?.claim && !leaseDiscarded) restorePrivateClaim(leaseResult.claim);
    if (!lockDiscarded) restorePrivateClaim(claim);
    throw error;
  }
}

function quarantineMatchingRecoveryState(metadata, lockRoot, kind, observed, purpose) {
  if (!observed) return null;
  const claim = quarantineValidatedRecoveryState(metadata, lockRoot, kind, purpose);
  if (!claim) throw new Error(`Next-env ${kind} recovery state disappeared before cleanup.`);
  if (!sameInode(claim.node.stat, observed.node.stat)) {
    restorePrivateClaim(claim);
    throw new Error(`Next-env ${kind} recovery state changed before cleanup.`);
  }
  return claim;
}

function quarantineMatchingMainLock(paths, observed, purpose) {
  const claim = quarantineValidatedLock(paths.lockPath, paths.canonicalCwd, purpose);
  if (!claim) throw new Error("Next-env main lock disappeared before cleanup.");
  if (!sameInode(claim.stat, observed.stat) || claim.metadata.token !== observed.metadata.token) {
    restorePrivateClaim(claim);
    throw new Error("Next-env main lock changed before cleanup.");
  }
  return claim;
}

function recoverAndDiscardStaleMainLock(observedMain, paths, purpose) {
  const metadata = observedMain.metadata;
  let snapshotState = null;
  let childState = null;

  if (metadata.version === 2 && metadata.role === "main") {
    // Read and validate all durable recovery records through their own bounded,
    // no-follow descriptors while the canonical main lock remains in place.
    snapshotState = readValidatedRecoveryState(metadata, paths.lockRoot, "snapshot");
    childState = readValidatedRecoveryState(metadata, paths.lockRoot, "child");
    if (childState && recordedChildGroupRequiresBarrier(childState)) return false;
    if (childState && !snapshotState) {
      throw new Error("Refusing to recover a stale next-env child without its durable snapshot.");
    }
    if (snapshotState) {
      restoreNextEnv(path.join(paths.canonicalCwd, "next-env.d.ts"), snapshotState.record.snapshot);
    }
  }

  // Restoration is complete and idempotent before any canonical recovery node
  // is renamed away. Clean token-bound state first and the canonical main lock
  // last, so every crash window before the final rename still fences contenders.
  const leaseResult = quarantineStaleLease(metadata, paths.lockRoot, purpose);
  if (leaseResult.live) return false;
  if (leaseResult.claim) discardPrivateClaim(leaseResult.claim);

  const childClaim = quarantineMatchingRecoveryState(
    metadata,
    paths.lockRoot,
    "child",
    childState,
    purpose
  );
  if (childClaim) discardPrivateClaim(childClaim);
  const snapshotClaim = quarantineMatchingRecoveryState(
    metadata,
    paths.lockRoot,
    "snapshot",
    snapshotState,
    purpose
  );
  if (snapshotClaim) discardPrivateClaim(snapshotClaim);

  const mainClaim = quarantineMatchingMainLock(paths, observedMain, "stale-main");
  discardPrivateClaim(mainClaim);
  return true;
}

function clearStaleRecoveryLock(paths) {
  const observed = readValidatedLock(paths.recoveryLockPath, paths.canonicalCwd);
  if (!observed || lockOwnerIsAlive(observed.metadata, paths.lockRoot)) return false;
  const claim = quarantineValidatedLock(paths.recoveryLockPath, paths.canonicalCwd, "stale-recovery");
  if (!claim) return false;
  if (
    !sameInode(claim.stat, observed.stat)
    || lockOwnerIsAlive(claim.metadata, paths.lockRoot)
  ) {
    restorePrivateClaim(claim);
    return false;
  }
  return discardStaleLockClaim(claim, paths.lockRoot, "stale-recovery-lease");
}

function tryAcquireRecoveryLock(paths) {
  clearStaleRecoveryLock(paths);
  try {
    return createOwnedLock(paths.recoveryLockPath, paths.canonicalCwd, "recovery");
  } catch (error) {
    if (error?.code === "EEXIST") return null;
    throw error;
  }
}

function tryRemoveStaleMainLock(paths) {
  const observed = readValidatedLock(paths.lockPath, paths.canonicalCwd);
  if (!observed || lockOwnerIsAlive(observed.metadata, paths.lockRoot)) return false;
  const recovery = tryAcquireRecoveryLock(paths);
  if (!recovery) return false;
  try {
    const current = readValidatedLock(paths.lockPath, paths.canonicalCwd);
    if (!current || lockOwnerIsAlive(current.metadata, paths.lockRoot)) return false;
    return recoverAndDiscardStaleMainLock(current, paths, "stale-main-lease");
  } finally {
    releaseOwnedLockDirect(recovery, "stale-recovery-release");
  }
}

async function acquireRecoveryGuard(paths) {
  const deadline = Date.now() + nextEnvLockTimeoutMs;
  while (true) {
    const recovery = tryAcquireRecoveryLock(paths);
    if (recovery) return recovery;
    if (Date.now() >= deadline) {
      throw new Error(`Timed out acquiring next-env restore guard in ${paths.canonicalCwd}.`);
    }
    await new Promise((resolve) => setTimeout(resolve, nextEnvLockPollMs));
  }
}

async function acquireNextEnvLock(cwd) {
  const paths = nextEnvLockPaths(cwd);
  cleanupOrphanPublishFiles(paths);
  cleanupOrphanStatePublishFiles(paths);
  cleanupOrphanLeaseFiles(paths);
  const deadline = Date.now() + nextEnvLockTimeoutMs;

  while (true) {
    const recovery = readValidatedLock(paths.recoveryLockPath, paths.canonicalCwd);
    if (recovery) {
      if (!lockOwnerIsAlive(recovery.metadata, paths.lockRoot)) {
        clearStaleRecoveryLock(paths);
      }
      if (Date.now() >= deadline) {
        throw new Error(`Timed out waiting for next-env lock recovery in ${paths.canonicalCwd}.`);
      }
      await new Promise((resolve) => setTimeout(resolve, nextEnvLockPollMs));
      continue;
    }

    try {
      const lock = createOwnedLock(paths.lockPath, paths.canonicalCwd, "main");
      let recoveryAfterAcquire;
      try {
        recoveryAfterAcquire = readValidatedLock(paths.recoveryLockPath, paths.canonicalCwd);
      } catch (error) {
        releaseOwnedLockDirect(lock, "aborted-acquire");
        throw error;
      }
      if (!recoveryAfterAcquire) return { ...lock, ...paths };
      releaseOwnedLockDirect(lock, "recovery-race");
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      tryRemoveStaleMainLock(paths);
      if (Date.now() >= deadline) {
        throw new Error(`Timed out waiting for the next-env lock in ${paths.canonicalCwd}.`);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, nextEnvLockPollMs));
  }
}

async function restoreNextEnvAndRelease(lock, nextEnvPath, snapshot, shouldRestore) {
  let guard;
  try {
    guard = await acquireRecoveryGuard(lock);
    const observedMain = readValidatedLock(lock.lockPath, lock.canonicalCwd);
    if (
      !observedMain
      || !sameInode(observedMain.stat, lock.stat)
      || observedMain.metadata.token !== lock.token
    ) {
      throw new Error("Refusing to restore next-env for a main lock owned by another process.");
    }
    const observedSnapshot = lock.snapshotState
      ? readValidatedRecoveryState(lock.metadata, lock.lockRoot, "snapshot")
      : null;
    const observedChild = lock.childState
      ? readValidatedRecoveryState(lock.metadata, lock.lockRoot, "child")
      : null;
    if (
      lock.snapshotState
      && (!observedSnapshot || !sameInode(observedSnapshot.node.stat, lock.snapshotState.stat))
    ) {
      throw new Error("Owned next-env snapshot recovery state changed before restore.");
    }
    if (
      lock.childState
      && (!observedChild || !sameInode(observedChild.node.stat, lock.childState.stat))
    ) {
      throw new Error("Owned next-env child recovery state changed before restore.");
    }

    if (snapshot && shouldRestore) restoreNextEnv(nextEnvPath, snapshot);

    const childClaim = quarantineMatchingRecoveryState(
      lock.metadata,
      lock.lockRoot,
      "child",
      observedChild,
      "release"
    );
    if (childClaim) discardPrivateClaim(childClaim);
    const snapshotClaim = quarantineMatchingRecoveryState(
      lock.metadata,
      lock.lockRoot,
      "snapshot",
      observedSnapshot,
      "release"
    );
    if (snapshotClaim) discardPrivateClaim(snapshotClaim);

    removeOwnedLeaseBeforeMain(lock);

    // This is deliberately the final canonical recovery-path removal. If the
    // wrapper is killed during any earlier step, the main lock remains visible
    // and prevents a contender from snapshotting a child mutation.
    const mainClaim = quarantineMatchingMainLock(lock, observedMain, "release");
    discardPrivateClaim(mainClaim);
  } finally {
    try {
      stopOwnedLease(lock);
    } finally {
      if (guard) releaseOwnedLockDirect(guard, "restore-guard-release");
    }
  }
}

function snapshotNextEnv(nextEnvPath) {
  try {
    const stat = statSync(nextEnvPath);
    return {
      existed: true,
      contents: readFileSync(nextEnvPath),
      mode: stat.mode & 0o777
    };
  } catch (error) {
    if (error?.code === "ENOENT") return { existed: false };
    throw error;
  }
}

function restoreNextEnv(nextEnvPath, snapshot) {
  if (!snapshot.existed) {
    rmSync(nextEnvPath, { force: true });
    return;
  }

  const restorePath = path.join(
    path.dirname(nextEnvPath),
    `.next-env.d.ts.restore-${process.pid}-${randomUUID()}`
  );
  try {
    writeFileSync(restorePath, snapshot.contents, { flag: "wx", mode: snapshot.mode });
    chmodSync(restorePath, snapshot.mode);
    renameSync(restorePath, nextEnvPath);
  } finally {
    rmSync(restorePath, { force: true });
  }
}

function signalExitCode(signal) {
  return 128 + (osConstants.signals[signal] ?? 1);
}

function childGateStdio(stdio) {
  if (stdio === undefined || stdio === "inherit") {
    return ["inherit", "inherit", "inherit", "pipe"];
  }
  if (stdio === "ignore") return ["ignore", "ignore", "ignore", "pipe"];
  if (stdio === "pipe") return ["pipe", "pipe", "pipe", "pipe"];
  if (Array.isArray(stdio)) {
    if (stdio.length > 3) {
      throw new Error("with-next-env-restore reserves child descriptor 3 for its start gate.");
    }
    return [stdio[0] ?? "pipe", stdio[1] ?? "pipe", stdio[2] ?? "pipe", "pipe"];
  }
  throw new Error("with-next-env-restore received an unsupported stdio configuration.");
}

async function activateChildGate(child, childState) {
  const startGate = child.stdio?.[3];
  if (!startGate || typeof startGate.end !== "function") {
    throw new Error("Could not establish the child start gate.");
  }
  await new Promise((resolve, reject) => {
    startGate.once("error", reject);
    startGate.end(`${JSON.stringify({
      version: 1,
      command: "start",
      statePath: childState.path,
      stateDevice: String(childState.stat.dev),
      stateInode: String(childState.stat.ino),
      token: childState.record.token
    })}\n`, resolve);
  });
}

function openChildGateHeartbeat(activation) {
  if (
    activation?.version !== 1
    || activation.command !== "start"
    || typeof activation.statePath !== "string"
    || path.resolve(activation.statePath) !== activation.statePath
    || typeof activation.token !== "string"
    || !nextEnvTokenPattern.test(activation.token)
    || !/^\d+$/u.test(activation.stateDevice ?? "")
    || !/^\d+$/u.test(activation.stateInode ?? "")
  ) {
    throw new Error("Invalid child start-gate activation metadata.");
  }
  const nameMatch = nextEnvChildFilePattern.exec(path.basename(activation.statePath));
  if (!nameMatch || nameMatch[2] !== activation.token) {
    throw new Error("Invalid child start-gate recovery path.");
  }

  const descriptor = openSync(
    activation.statePath,
    fsConstants.O_RDWR | fsConstants.O_NOFOLLOW | fsConstants.O_NONBLOCK
  );
  try {
    const stat = fstatSync(descriptor);
    if (
      !stat.isFile()
      || stat.nlink !== 1
      || stat.uid !== process.getuid()
      || (stat.mode & 0o077) !== 0
      || String(stat.dev) !== activation.stateDevice
      || String(stat.ino) !== activation.stateInode
      || stat.size > maxRecoveryStateBytes
    ) {
      throw new Error("Refusing unsafe child start-gate recovery state.");
    }
    const stateText = readBoundedText(descriptor, maxRecoveryStateBytes, "child recovery state");
    const state = JSON.parse(stateText);
    const currentBirthIdentity = processBirthIdentity(process.pid);
    if (
      state?.kind !== "child"
      || state.token !== activation.token
      || state.processGroupId !== process.pid
      || state.processBirthIdentity !== currentBirthIdentity
    ) {
      throw new Error("Child start-gate recovery token does not match its inode.");
    }
    let reportHeartbeatFailure;
    const heartbeatFailure = new Promise((resolve) => {
      reportHeartbeatFailure = resolve;
    });
    const lease = {
      descriptor,
      stat,
      heartbeat: null,
      heartbeatError: null,
      heartbeatFailure,
      reportHeartbeatFailure
    };
    startOwnedLeaseHeartbeat(lease);
    return lease;
  } catch (error) {
    closeSync(descriptor);
    throw error;
  }
}

async function runChildCommandGate(command, args) {
  const activationText = readBoundedText(3, maxLockMetadataBytes, "child start-gate metadata");
  if (!activationText) {
    throw new Error("Parent wrapper exited before the child command was durably fenced.");
  }
  let activation;
  try {
    activation = JSON.parse(activationText);
  } catch (error) {
    throw new Error("Invalid child start-gate activation JSON.", { cause: error });
  }
  const gateLease = openChildGateHeartbeat(activation);
  let child;
  try {
    child = spawn(command, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit"
    });
    const childOutcome = new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("exit", (code, signal) => resolve({ code, signal }));
    });
    const completed = await Promise.race([
      childOutcome.then((outcome) => ({ kind: "child", outcome })),
      gateLease.heartbeatFailure.then((error) => ({ kind: "heartbeat-error", error }))
    ]);
    if (completed.kind === "heartbeat-error") {
      // This process is the detached process-group leader. If its durable
      // recovery heartbeat fails, no surviving member of the group may keep
      // mutating next-env.d.ts after a contender judges the state stale.
      // SIGKILL includes this gate, the direct command, and every descendant
      // that remained in the inherited group.
      signalProcessGroup(process.pid, "SIGKILL");
      throw new Error("Child recovery heartbeat failed without terminating its process group.", {
        cause: completed.error
      });
    }
    if (completed.outcome.signal) {
      process.kill(process.pid, completed.outcome.signal);
      return signalExitCode(completed.outcome.signal);
    }
    return completed.outcome.code ?? 1;
  } finally {
    stopOwnedLease({ lease: gateLease }, false);
  }
}

export async function runWithNextEnvRestore(command, args, options = {}) {
  assertSupportedPlatform();
  const lock = await acquireNextEnvLock(options.cwd ?? process.cwd());
  const cwd = lock.canonicalCwd;
  const nextEnvPath = path.join(cwd, "next-env.d.ts");
  let snapshot;
  let requestedSignal = null;
  let forceKillTimer = null;
  let child;
  let childProcessGroupId = null;
  let processTreeConfirmedStopped = true;

  const forwardSignal = (signal) => {
    if (!childProcessGroupId || !processGroupIsAlive(childProcessGroupId)) return;
    signalProcessGroup(childProcessGroupId, signal);
    if (!forceKillTimer) {
      forceKillTimer = setTimeout(() => {
        if (processGroupIsAlive(childProcessGroupId)) {
          signalProcessGroup(childProcessGroupId, "SIGKILL");
        }
      }, forceKillDelayMs);
    }
  };

  const handlers = new Map(forwardedSignals.map((signal) => [signal, () => {
    requestedSignal ??= signal;
    forwardSignal(signal);
  }]));

  try {
    snapshot = snapshotNextEnv(nextEnvPath);
    lock.snapshotState = persistSnapshotRecoveryState(lock, snapshot);
    for (const [signal, handler] of handlers) process.on(signal, handler);
    child = spawn(process.execPath, [fileURLToPath(import.meta.url), "--child-gate", "--", command, ...args], {
      cwd,
      detached: true,
      env: options.env ?? process.env,
      stdio: childGateStdio(options.stdio)
    });
    const childOutcome = new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("exit", (code, signal) => resolve({ code, signal }));
    });
    childProcessGroupId = child.pid ?? null;
    if (!childProcessGroupId) throw new Error("Could not establish a detached child process group.");
    const childProcessBirthIdentity = processBirthIdentity(childProcessGroupId);
    if (!childProcessBirthIdentity) {
      throw new Error("Could not establish the detached child process-birth identity.");
    }
    lock.childState = persistChildRecoveryState(
      lock,
      childProcessGroupId,
      childProcessBirthIdentity
    );
    if (requestedSignal) {
      forwardSignal(requestedSignal);
      child.stdio[3]?.end();
    } else {
      await activateChildGate(child, lock.childState);
    }

    const completed = await Promise.race([
      childOutcome.then((outcome) => ({ kind: "child", outcome })),
      lock.lease.heartbeatFailure.then((error) => ({ kind: "heartbeat-error", error }))
    ]);
    if (completed.kind === "heartbeat-error") {
      const detail = completed.error instanceof Error ? completed.error.message : String(completed.error);
      throw new Error(`Next-env lock heartbeat failed while the child group was active: ${detail}`, {
        cause: completed.error
      });
    }
    const { outcome } = completed;
    if (childProcessGroupId && processGroupIsAlive(childProcessGroupId)) {
      processTreeConfirmedStopped = false;
      forwardSignal(requestedSignal ?? outcome.signal ?? "SIGTERM");
      await waitForProcessGroupExit(childProcessGroupId);
      processTreeConfirmedStopped = true;
    }
    if (requestedSignal) return signalExitCode(requestedSignal);
    if (outcome.signal) return signalExitCode(outcome.signal);
    return outcome.code ?? 1;
  } finally {
    if (forceKillTimer) clearTimeout(forceKillTimer);
    for (const [signal, handler] of handlers) process.removeListener(signal, handler);
    let processTreeError = null;
    try {
      if (childProcessGroupId && processGroupIsAlive(childProcessGroupId)) {
        processTreeConfirmedStopped = false;
        signalProcessGroup(childProcessGroupId, "SIGKILL");
        await waitForProcessGroupExit(childProcessGroupId);
        processTreeConfirmedStopped = true;
      }
    } catch (error) {
      processTreeError = error;
    }
    if (processTreeError || !processTreeConfirmedStopped) {
      // Never discard the main lock or recovery records when process-group
      // termination is unconfirmed. Closing the heartbeat makes the durable
      // claim recoverable later, while the canonical main path keeps every
      // contender fail-closed until that group is observably gone.
      stopOwnedLease(lock, false);
      throw processTreeError ?? new Error("Child process group termination could not be confirmed.");
    }
    await restoreNextEnvAndRelease(
      lock,
      nextEnvPath,
      snapshot,
      Boolean(snapshot)
    );
  }
}

function commandFromCli(argv) {
  const separator = argv.indexOf("--");
  const commandArgs = separator === -1 ? [] : argv.slice(separator + 1);
  if (commandArgs.length === 0) {
    throw new Error("Usage: node scripts/with-next-env-restore.mjs -- <command> [args...]");
  }
  return { command: commandArgs[0], args: commandArgs.slice(1) };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const { command, args } = commandFromCli(process.argv.slice(2));
    process.exitCode = process.argv[2] === "--child-gate"
      ? await runChildCommandGate(command, args)
      : await runWithNextEnvRestore(command, args);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
