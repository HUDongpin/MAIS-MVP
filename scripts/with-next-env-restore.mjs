import { spawn } from "node:child_process";
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
import { constants as osConstants, tmpdir } from "node:os";
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
const nextEnvLeaseHeartbeatMs = 250;
const nextEnvLeaseTimeoutMs = 10_000;
const nextEnvLeaseClockSkewMs = 5_000;
const maxLockMetadataBytes = 4_096;

function assertSupportedPlatform() {
  if (process.platform === "win32") {
    throw new Error(
      "with-next-env-restore requires POSIX process groups; Windows execution is intentionally unsupported."
    );
  }
  if (!fsConstants.O_NOFOLLOW || !fsConstants.O_NONBLOCK) {
    throw new Error("with-next-env-restore requires POSIX O_NOFOLLOW and O_NONBLOCK lock reads.");
  }
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
  const canonicalTempRoot = realpathSync(path.resolve(tmpdir()));
  const lockBase = path.join(canonicalTempRoot, nextEnvLockBaseDirectoryName);
  mkdirSync(lockBase, { recursive: true, mode: 0o700 });
  assertPrivateLockDirectory(lockBase, "OS-temp lock root", uid);

  const worktreeDigest = createHash("sha256").update(canonicalCwd).digest("hex");
  const lockRoot = path.join(lockBase, `uid-${uid}-${worktreeDigest}`);
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

function readBoundedLockText(descriptor) {
  const buffer = Buffer.alloc(maxLockMetadataBytes + 1);
  let offset = 0;
  while (offset < buffer.length) {
    const bytesRead = readSync(descriptor, buffer, offset, buffer.length - offset, null);
    if (bytesRead === 0) break;
    offset += bytesRead;
  }
  if (offset > maxLockMetadataBytes) {
    throw new Error(`Refusing next-env lock metadata larger than ${maxLockMetadataBytes} bytes.`);
  }
  return buffer.subarray(0, offset).toString("utf8");
}

function readLockNode(lockPath) {
  let descriptor;
  try {
    descriptor = openSync(
      lockPath,
      fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW | fsConstants.O_NONBLOCK
    );
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw new Error(`Refusing unsafe next-env lock node: ${lockPath}`, { cause: error });
  }

  try {
    const stat = fstatSync(descriptor);
    if (!stat.isFile() || stat.nlink < 1 || stat.nlink > 2 || stat.size > maxLockMetadataBytes) {
      throw new Error(`Refusing unsafe next-env lock node: ${lockPath}`);
    }
    if (stat.uid !== process.getuid()) {
      throw new Error(`Refusing next-env lock owned by another user: ${lockPath}`);
    }
    if ((stat.mode & 0o077) !== 0) {
      throw new Error(`Refusing non-private next-env lock: ${lockPath}`);
    }
    return { stat, text: readBoundedLockText(descriptor) };
  } finally {
    closeSync(descriptor);
  }
}

function parseValidatedLockNode(node, lockPath, canonicalCwd) {
  let metadata;
  try {
    metadata = JSON.parse(node.text);
  } catch (error) {
    throw new Error(`Refusing malformed next-env lock metadata: ${lockPath}`, { cause: error });
  }
  if (
    metadata?.version !== 1 ||
    !Number.isSafeInteger(metadata.pid) ||
    metadata.pid <= 0 ||
    typeof metadata.token !== "string" ||
    !nextEnvTokenPattern.test(metadata.token) ||
    metadata.leaseName !== leaseNameFor(metadata.pid, metadata.token) ||
    typeof metadata.leaseDevice !== "string" ||
    !/^\d+$/u.test(metadata.leaseDevice) ||
    typeof metadata.leaseInode !== "string" ||
    !/^\d+$/u.test(metadata.leaseInode) ||
    metadata.canonicalCwd !== canonicalCwd ||
    typeof metadata.createdAt !== "string" ||
    !Number.isFinite(Date.parse(metadata.createdAt))
  ) {
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
  unlinkSync(claimPath);
  return true;
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
    return { leaseName, leasePath, descriptor, stat, heartbeat: null, heartbeatError: null };
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
      clearInterval(lease.heartbeat);
      lease.heartbeat = null;
    }
  }, nextEnvLeaseHeartbeatMs);
  lease.heartbeat.unref();
}

function stopOwnedLease(lock, removeLease = true) {
  const lease = lock?.lease;
  if (!lease) return;
  if (lease.heartbeat) {
    clearInterval(lease.heartbeat);
    lease.heartbeat = null;
  }
  if (lease.descriptor !== undefined) {
    closeSync(lease.descriptor);
    lease.descriptor = undefined;
  }
  if (removeLease) unlinkPrivateClaim(lease.leasePath, lease.stat);
}

function createOwnedLock(lockPath, canonicalCwd) {
  const lockRoot = path.dirname(lockPath);
  const token = randomUUID();
  const lease = createOwnedLease(lockRoot, token);
  const publishName = publishNameFor(process.pid, token);
  const publishPath = path.join(lockRoot, publishName);
  const metadata = JSON.stringify({
    version: 1,
    pid: process.pid,
    token,
    leaseName: lease.leaseName,
    leaseDevice: String(lease.stat.dev),
    leaseInode: String(lease.stat.ino),
    canonicalCwd,
    createdAt: new Date().toISOString()
  });
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
    const lock = { lockPath, canonicalCwd, token, stat: openedStat, lease };
    startOwnedLeaseHeartbeat(lease);
    return lock;
  } catch (error) {
    if (descriptor !== undefined) closeSync(descriptor);
    if (openedStat) unlinkPrivateClaim(publishPath, openedStat);
    stopOwnedLease({ lease });
    throw error;
  }
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
    if (!unlinkPrivateClaim(publishPath, stat)) {
      throw new Error(`Orphan next-env publish inode changed before cleanup: ${publishPath}`);
    }
    if (stat.nlink === 1 && lease) unlinkPrivateClaim(lease.leasePath, lease.node.stat);
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
    if (!unlinkPrivateClaim(lease.leasePath, lease.node.stat)) {
      throw new Error(`Orphan next-env lease inode changed before cleanup: ${lease.leasePath}`);
    }
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
    return createOwnedLock(paths.recoveryLockPath, paths.canonicalCwd);
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
    const claim = quarantineValidatedLock(paths.lockPath, paths.canonicalCwd, "stale-main");
    if (!claim) return false;
    if (
      !sameInode(claim.stat, current.stat)
      || lockOwnerIsAlive(claim.metadata, paths.lockRoot)
    ) {
      restorePrivateClaim(claim);
      return false;
    }
    return discardStaleLockClaim(claim, paths.lockRoot, "stale-main-lease");
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
      const lock = createOwnedLock(paths.lockPath, paths.canonicalCwd);
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
  let claim;
  try {
    guard = await acquireRecoveryGuard(lock);
    claim = quarantineOwnedLock(lock, "release");
    if (snapshot && shouldRestore) restoreNextEnv(nextEnvPath, snapshot);
    discardPrivateClaim(claim);
    claim = null;
  } catch (error) {
    if (claim) restorePrivateClaim(claim);
    throw error;
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
    for (const [signal, handler] of handlers) process.on(signal, handler);
    child = spawn(command, args, {
      cwd,
      detached: true,
      env: options.env ?? process.env,
      stdio: options.stdio ?? "inherit"
    });
    childProcessGroupId = child.pid ?? null;
    if (requestedSignal) forwardSignal(requestedSignal);

    const outcome = await new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("exit", (code, signal) => resolve({ code, signal }));
    });
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
    await restoreNextEnvAndRelease(
      lock,
      nextEnvPath,
      snapshot,
      Boolean(snapshot && processTreeConfirmedStopped)
    );
    if (processTreeError) throw processTreeError;
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
    process.exitCode = await runWithNextEnvRestore(command, args);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
