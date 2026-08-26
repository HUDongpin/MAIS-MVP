import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { chmod, link, lstat, open, readdir, unlink } from "node:fs/promises";
import path from "node:path";

import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  assertClosedSelfHashedArtifactV5R4,
} from "./schema-contract-v5-r4.mjs";
import {
  assertClosedSelfHashedArtifactV5R5,
  validateClosedSelfHashedArtifactV5R5,
} from "./schema-contract-v5-r5.mjs";
import {
  atomicWriteProtectedJsonV5R4,
  ensureProtectedDirectoryV5R4,
  readProtectedJsonV5R4,
} from "./protected-storage-v5-r4.mjs";
import {
  deriveReservedCostV5R4,
} from "./route-authorization-v5-r4.mjs";
import {
  validateExecutionLedgerEntriesV5R4,
} from "./atomic-execution-ledger-v5-r4.mjs";
import {
  buildStaleLockRecoveryReceiptV5R5,
  buildInterruptedAttemptRecoveryReceiptV5R5,
} from "./recovery-v5-r5.mjs";
import {
  buildStateBoundPermitV5R5,
} from "./guarded-provider-attempt-v5-r5.mjs";

const ENTRY_PATTERN = /^(\d{8})-([0-9a-f]{64})\.json$/u;
const LOCK_NAME = ".ledger.lock";

function requireCondition(condition, message) { if (!condition) throw new TypeError(message); }
function nowIso(clock) {
  const observed = clock();
  const date = observed instanceof Date ? observed : new Date(observed);
  if (!Number.isFinite(date.getTime())) throw new TypeError("ledger clock is invalid");
  return date.toISOString();
}
async function fsyncDirectory(directory) {
  const handle = await open(directory, constants.O_RDONLY);
  try { await handle.sync(); } finally { await handle.close(); }
}
function completionByReservation(entries) {
  return new Map(entries.filter((entry) => entry.entryType === "DISPATCH_COMPLETED").map((entry) => [entry.reservationHash, entry]));
}
function accounting(entries) {
  const reservations = entries.filter((entry) => entry.entryType === "DISPATCH_RESERVED");
  const completions = completionByReservation(entries);
  const active = reservations.filter((reservation) => !completions.has(reservation.selfHash));
  let accountedInputTokens = 0; let accountedOutputTokens = 0; let accountedTokens = 0; let accountedUsd = 0; let successes = 0;
  for (const reservation of reservations) {
    const completion = completions.get(reservation.selfHash);
    const receipt = completion?.providerEventReceipt;
    if (!completion) {
      accountedInputTokens += reservation.reservedInputTokens; accountedOutputTokens += reservation.reservedOutputTokens;
      accountedTokens += reservation.reservedTokens; accountedUsd += reservation.reservedUsd;
    } else if (receipt.providerEventCount === 0 && receipt.httpRequestCount === 0) {
      // An attempt reservation remains immutable but proven local non-dispatch
      // releases provider token and USD accounting.
    } else if (receipt.usageSource === "PROVIDER_ENVELOPE") {
      accountedInputTokens += receipt.inputTokens; accountedOutputTokens += receipt.outputTokens;
      accountedTokens += receipt.totalTokens; accountedUsd += receipt.estimatedCostUsd;
    } else {
      accountedInputTokens += reservation.reservedInputTokens; accountedOutputTokens += reservation.reservedOutputTokens;
      accountedTokens += reservation.reservedTokens; accountedUsd += reservation.reservedUsd;
    }
    if (completion?.attemptStatus === "SUCCEEDED") successes += 1;
  }
  return Object.freeze({ reservations, completions, active, accountedInputTokens, accountedOutputTokens, accountedTokens,
    accountedUsd: Number(accountedUsd.toFixed(12)), successes });
}

function buildLock({ activeRunnerRegistrationHash, authorizationHash, ledgerRelativePath, ownerPid, lockNonce, acquiredAt }) {
  const lock = sealV5R3Artifact({
    schemaVersion: "ExecutionLedgerLockV1",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash,
    authorizationHash,
    ledgerRelativePathHash: sha256V5R3(ledgerRelativePath),
    ownerPid,
    lockNonce,
    acquiredAt,
  });
  assertClosedSelfHashedArtifactV5R5(lock, "ExecutionLedgerLockV1");
  return lock;
}

async function acquireLock({ directory, activeRunnerRegistrationHash, authorizationHash, ledgerRelativePath, clock, ownerPid }) {
  const lockPath = path.join(directory, LOCK_NAME);
  const flags = constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (constants.O_NOFOLLOW ?? 0);
  const lock = buildLock({ activeRunnerRegistrationHash, authorizationHash, ledgerRelativePath, ownerPid,
    lockNonce: randomUUID().replaceAll("-", ""), acquiredAt: nowIso(clock) });
  let handle;
  try {
    handle = await open(lockPath, flags, 0o600);
    await handle.writeFile(`${canonicalJsonV5R3(lock)}\n`, "utf8");
    await handle.sync();
    await fsyncDirectory(directory);
  } catch (error) {
    if (handle) await handle.close().catch(() => {});
    if (error?.code === "EEXIST") throw new Error("execution ledger is busy; explicit authenticated stale-lock recovery is required");
    throw error;
  }
  return {
    lock,
    async release() {
      await handle.close();
      const bytes = await readExactRegularFile(lockPath);
      requireCondition(bytes === `${canonicalJsonV5R3(lock)}\n`, "ledger lock changed before release");
      await unlink(lockPath);
      await fsyncDirectory(directory);
    },
  };
}

async function readExactRegularFile(absolutePath) {
  const before = await lstat(absolutePath);
  if (before.isSymbolicLink() || !before.isFile()) throw new Error("ledger recovery target is not a regular non-symlink file");
  const handle = await open(absolutePath, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const opened = await handle.stat();
    if (!opened.isFile() || opened.dev !== before.dev || opened.ino !== before.ino) throw new Error("ledger recovery target changed during no-follow open");
    return await handle.readFile("utf8");
  } finally { await handle.close(); }
}

function defaultPidProbe(pid) {
  try { process.kill(pid, 0); return true; }
  catch (error) { return error?.code !== "ESRCH"; }
}

export async function createAtomicExecutionLedgerV5R5({ trustedRoot, ledgerRelativePath, activeRegistration,
  authorization, inventory, priceSnapshot, clock = () => new Date(), ownerPid = process.pid }) {
  assertClosedSelfHashedArtifactV5R5(activeRegistration, "NaturalCaExecutionRunnerSupersedingRegistrationV1");
  assertClosedSelfHashedArtifactV5R4(authorization, "ProviderAuthorizationV4");
  assertClosedSelfHashedArtifactV5R4(inventory, "SampleExecutionInventoryV2");
  assertClosedSelfHashedArtifactV5R4(priceSnapshot, "ProviderPriceSnapshotV2");
  requireCondition(authorization.sampleExecutionInventoryHash === inventory.selfHash && authorization.priceSnapshotHash === priceSnapshot.selfHash,
    "R5 ledger authorization does not bind inventory and price snapshot");
  requireCondition(Number.isSafeInteger(ownerPid) && ownerPid > 0, "R5 ledger owner PID is invalid");
  const directory = await ensureProtectedDirectoryV5R4({ trustedRoot, relativePath: ledgerRelativePath });

  async function readEntries({ allowLock = false } = {}) {
    const names = await readdir(directory);
    const errors = [];
    if (!allowLock && names.includes(LOCK_NAME)) errors.push("active or stale ledger lock requires explicit authenticated recovery");
    for (const name of names) {
      if (name.endsWith(".tmp")) errors.push(`${name}: incomplete atomic write requires explicit recovery`);
      else if (name !== LOCK_NAME && !ENTRY_PATTERN.test(name)) errors.push(`${name}: unexpected ledger file`);
    }
    const entries = [];
    for (const [index, name] of names.filter((name) => ENTRY_PATTERN.test(name)).sort().entries()) {
      const entry = await readProtectedJsonV5R4({ trustedRoot, relativePath: path.join(ledgerRelativePath, name) });
      const match = ENTRY_PATTERN.exec(name);
      if (Number(match[1]) !== index + 1 || match[2] !== entry.selfHash) errors.push(`${name}: filename sequence or hash is invalid`);
      entries.push(entry);
    }
    errors.push(...validateExecutionLedgerEntriesV5R4({ entries, authorization, inventory }));
    return { entries, errors: [...new Set(errors)] };
  }

  async function append(entry) {
    const filename = `${String(entry.sequenceNumber).padStart(8, "0")}-${entry.selfHash}.json`;
    await atomicWriteProtectedJsonV5R4({ trustedRoot, relativePath: path.join(ledgerRelativePath, filename), value: entry });
  }

  async function reserve({ requestArtifact }) {
    assertClosedSelfHashedArtifactV5R4(requestArtifact, "ProviderRequestArtifactV4");
    requireCondition(requestArtifact.authorizationHash === authorization.selfHash
      && requestArtifact.sampleExecutionInventoryHash === inventory.selfHash, "request does not bind this R5 ledger");
    const held = await acquireLock({ directory, activeRunnerRegistrationHash: activeRegistration.selfHash,
      authorizationHash: authorization.selfHash, ledgerRelativePath, clock, ownerPid });
    try {
      const { entries, errors } = await readEntries({ allowLock: true });
      if (errors.length > 0) throw new Error(`R5 execution ledger integrity failed: ${errors.join("; ")}`);
      const totals = accounting(entries);
      if (totals.reservations.some(({ attemptId }) => attemptId === requestArtifact.attemptId)) throw new Error("duplicate attemptId is forbidden");
      const scoped = totals.reservations.filter((entry) => entry.itemHash === requestArtifact.itemHash && entry.role === requestArtifact.role);
      if (scoped.length >= authorization.maximumAttemptsPerItemRole) throw new Error("authorization per-item-role attempt cap exhausted");
      if (scoped.some((reservation) => totals.completions.get(reservation.selfHash)?.attemptStatus === "SUCCEEDED")) throw new Error("successful item-role may not be executed again");
      if (totals.reservations.length >= authorization.maximumAttempts || totals.successes + totals.active.length >= authorization.maximumSuccessfulCalls
        || totals.active.length >= authorization.concurrencyCap) throw new Error("authorization attempt, success, or concurrency cap exhausted");
      const reservedUsd = deriveReservedCostV5R4(requestArtifact, priceSnapshot);
      if (totals.accountedInputTokens + requestArtifact.reservedInputTokens > authorization.maximumInputTokens
        || totals.accountedOutputTokens + requestArtifact.reservedOutputTokens > authorization.maximumOutputTokens
        || totals.accountedTokens + requestArtifact.reservedTokens > authorization.maximumTokens
        || Number((totals.accountedUsd + reservedUsd).toFixed(12)) > authorization.maximumEstimatedUsd) {
        throw new Error("authorization input/output/total-token or USD cap exhausted");
      }
      const reservation = sealV5R3Artifact({
        schemaVersion: "ProviderDispatchReservationV2", entryType: "DISPATCH_RESERVED", status: "RESERVED",
        sequenceNumber: entries.length + 1, previousEntryHash: entries.at(-1)?.selfHash ?? null,
        authorizationHash: authorization.selfHash, requestArtifactHash: requestArtifact.selfHash,
        attemptId: requestArtifact.attemptId, role: requestArtifact.role, itemHash: requestArtifact.itemHash,
        itemIdPseudonym: requestArtifact.itemIdPseudonym, clusterId: requestArtifact.clusterId,
        sampleExecutionInventoryHash: inventory.selfHash, reservedInputTokens: requestArtifact.reservedInputTokens,
        reservedOutputTokens: requestArtifact.reservedOutputTokens, reservedTokens: requestArtifact.reservedTokens,
        reservedUsd, priceSnapshotHash: priceSnapshot.selfHash,
      });
      assertClosedSelfHashedArtifactV5R4(reservation, "ProviderDispatchReservationV2");
      await append(reservation);
      return reservation;
    } finally { await held.release(); }
  }

  async function complete({ reservationHash, providerEventReceipt, roleOutput }) {
    assertClosedSelfHashedArtifactV5R4(providerEventReceipt, "ProviderEventReceiptV4");
    const held = await acquireLock({ directory, activeRunnerRegistrationHash: activeRegistration.selfHash,
      authorizationHash: authorization.selfHash, ledgerRelativePath, clock, ownerPid });
    try {
      const { entries, errors } = await readEntries({ allowLock: true });
      if (errors.length > 0) throw new Error(`R5 execution ledger integrity failed: ${errors.join("; ")}`);
      const reservation = entries.find((entry) => entry.entryType === "DISPATCH_RESERVED" && entry.selfHash === reservationHash);
      requireCondition(reservation && !entries.some((entry) => entry.entryType === "DISPATCH_COMPLETED" && entry.reservationHash === reservationHash),
        "reservation is absent or already completed");
      requireCondition(providerEventReceipt.reservationHash === reservation.selfHash
        && providerEventReceipt.authorizationHash === authorization.selfHash
        && providerEventReceipt.requestArtifactHash === reservation.requestArtifactHash
        && providerEventReceipt.attemptId === reservation.attemptId
        && providerEventReceipt.projectIdentityHash === authorization.projectIdentityHash
        && providerEventReceipt.dispatchPermit?.projectIdentityHash === authorization.projectIdentityHash,
      "provider event receipt does not bind the R5 reservation and provider subject");
      const successful = providerEventReceipt.attemptStatus === "SUCCEEDED";
      if (successful) {
        assertClosedSelfHashedArtifactV5R4(roleOutput, "ProviderRoleOutputV1");
        requireCondition(roleOutput.attemptReceiptHash === providerEventReceipt.selfHash
          && roleOutput.requestArtifactHash === reservation.requestArtifactHash && roleOutput.authorizationHash === authorization.selfHash
          && roleOutput.sampleExecutionInventoryHash === inventory.selfHash && roleOutput.itemHash === reservation.itemHash
          && roleOutput.role === reservation.role, "successful role output does not bind the R5 completion lineage");
      } else requireCondition(roleOutput === null, "failed attempt cannot create a role output");
      const completion = sealV5R3Artifact({
        schemaVersion: "ProviderDispatchCompletionV2", entryType: "DISPATCH_COMPLETED", status: "COMPLETED",
        sequenceNumber: entries.length + 1, previousEntryHash: entries.at(-1).selfHash,
        authorizationHash: authorization.selfHash, reservationHash: reservation.selfHash,
        providerEventReceiptHash: providerEventReceipt.selfHash, providerEventReceipt: structuredClone(providerEventReceipt),
        roleOutputHash: successful ? roleOutput.selfHash : null, roleOutput: successful ? structuredClone(roleOutput) : null,
        attemptStatus: providerEventReceipt.attemptStatus,
      });
      assertClosedSelfHashedArtifactV5R4(completion, "ProviderDispatchCompletionV2");
      await append(completion);
      return completion;
    } finally { await held.release(); }
  }

  async function recoverInterruptedReservation({ recoveryAuthorization, requestArtifact, dispatchAudit,
    freshReview, recoveredBy, recoveredAt = nowIso(clock) }) {
    assertClosedSelfHashedArtifactV5R5(recoveryAuthorization, "LedgerRecoveryAuthorizationV1");
    assertClosedSelfHashedArtifactV5R4(requestArtifact, "ProviderRequestArtifactV4");
    assertClosedSelfHashedArtifactV5R5(dispatchAudit, "StateBoundDispatchAuditReceiptV1");
    assertClosedSelfHashedArtifactV5R5(freshReview, "IndependentExecutionRunnerReviewReceiptV3");
    const held = await acquireLock({ directory, activeRunnerRegistrationHash: activeRegistration.selfHash,
      authorizationHash: authorization.selfHash, ledgerRelativePath, clock, ownerPid });
    try {
      const { entries, errors } = await readEntries({ allowLock: true });
      requireCondition(errors.length === 0, `R5 interrupted reservation cannot be recovered because its chain is invalid: ${errors.join("; ")}`);
      const reservation = entries.find((entry) => entry.entryType === "DISPATCH_RESERVED"
        && entry.selfHash === recoveryAuthorization.exactTargetHash);
      requireCondition(reservation && !entries.some((entry) => entry.entryType === "DISPATCH_COMPLETED"
        && entry.reservationHash === reservation.selfHash), "interrupted recovery target is absent or already completed");
      const ledgerRelativePathHash = sha256V5R3(ledgerRelativePath);
      requireCondition(recoveryAuthorization.recoveryKind === "INTERRUPTED_RESERVATION"
        && recoveryAuthorization.activeRunnerRegistrationHash === activeRegistration.selfHash
        && recoveryAuthorization.providerAuthorizationHash === authorization.selfHash
        && recoveryAuthorization.ledgerRelativePathHash === ledgerRelativePathHash
        && recoveryAuthorization.exactTargetHash === reservation.selfHash
        && recoveredBy === recoveryAuthorization.authorizedBy,
      "interrupted recovery authorization or operator binding is invalid");
      requireCondition(Date.parse(recoveredAt) >= Date.parse(recoveryAuthorization.issuedAt)
        && Date.parse(recoveredAt) < Date.parse(recoveryAuthorization.expiresAt)
        && Date.parse(recoveredAt) > Date.parse(dispatchAudit.issuedAt),
      "interrupted recovery authorization is expired, not yet valid, or chronologically invalid");
      requireCondition(requestArtifact.selfHash === reservation.requestArtifactHash
        && requestArtifact.authorizationHash === authorization.selfHash
        && requestArtifact.sampleExecutionInventoryHash === inventory.selfHash
        && requestArtifact.attemptId === reservation.attemptId
        && requestArtifact.itemHash === reservation.itemHash && requestArtifact.role === reservation.role,
      "interrupted recovery request artifact does not bind the exact reservation");
      requireCondition(dispatchAudit.activeRunnerRegistrationHash === activeRegistration.selfHash
        && dispatchAudit.freshRunnerReviewHash === freshReview.selfHash
        && dispatchAudit.providerAuthorizationHash === authorization.selfHash
        && dispatchAudit.sampleExecutionInventoryHash === inventory.selfHash
        && dispatchAudit.attemptId === reservation.attemptId
        && dispatchAudit.itemHash === reservation.itemHash && dispatchAudit.role === reservation.role
        && dispatchAudit.preReservationLedgerTerminalHash === reservation.previousEntryHash,
      "interrupted recovery dispatch audit does not bind the exact pre-reservation state");
      const permit = buildStateBoundPermitV5R5({
        input: { activeRegistration, freshReview, authorization, inventory, requestArtifact, at: dispatchAudit.issuedAt },
        reservation,
        dispatchAudit,
      });
      const providerEventReceipt = sealV5R3Artifact({
        schemaVersion: "ProviderEventReceiptV4",
        reservationHash: reservation.selfHash,
        authorizationHash: authorization.selfHash,
        requestArtifactHash: requestArtifact.selfHash,
        dispatchPermitHash: permit.selfHash,
        dispatchPermit: structuredClone(permit),
        attemptId: reservation.attemptId,
        role: reservation.role,
        itemHash: reservation.itemHash,
        itemIdPseudonym: reservation.itemIdPseudonym,
        clusterId: reservation.clusterId,
        provider: authorization.provider,
        requestedModel: authorization.model,
        observedModel: null,
        requestedEndpoint: authorization.endpoint,
        observedEndpoint: null,
        projectIdentityHash: authorization.projectIdentityHash,
        requestBodyHash: requestArtifact.wireRequestBodyHash,
        responseBodyHash: null,
        providerRequestId: null,
        startedAt: dispatchAudit.issuedAt,
        finishedAt: recoveredAt,
        latencyMs: Date.parse(recoveredAt) - Date.parse(dispatchAudit.issuedAt),
        transportStatus: "CONNECTION_LOST_AFTER_DISPATCH",
        bodyReadStatus: "NOT_AVAILABLE",
        httpStatus: null,
        providerEventCount: 1,
        httpRequestCount: 1,
        parseStatus: "NOT_PARSED",
        schemaStatus: "NOT_EVALUATED",
        finishReason: null,
        attemptStatus: "INTERRUPTED_RECOVERY_UNCERTAIN",
        usageSource: "UNAVAILABLE_RESERVED_WORST_CASE",
        inputTokens: null,
        outputTokens: null,
        reasoningTokens: null,
        totalTokens: null,
        priceSnapshotHash: reservation.priceSnapshotHash,
        estimatedCostUsd: reservation.reservedUsd,
        reservedInputTokens: reservation.reservedInputTokens,
        reservedOutputTokens: reservation.reservedOutputTokens,
        reservedTokens: reservation.reservedTokens,
        reservedCostUsd: reservation.reservedUsd,
        providerInvoiceAuthoritative: true,
      });
      assertClosedSelfHashedArtifactV5R4(providerEventReceipt, "ProviderEventReceiptV4");
      const completion = sealV5R3Artifact({
        schemaVersion: "ProviderDispatchCompletionV2",
        entryType: "DISPATCH_COMPLETED",
        status: "COMPLETED",
        sequenceNumber: entries.length + 1,
        previousEntryHash: entries.at(-1).selfHash,
        authorizationHash: authorization.selfHash,
        reservationHash: reservation.selfHash,
        providerEventReceiptHash: providerEventReceipt.selfHash,
        providerEventReceipt: structuredClone(providerEventReceipt),
        roleOutputHash: null,
        roleOutput: null,
        attemptStatus: providerEventReceipt.attemptStatus,
      });
      assertClosedSelfHashedArtifactV5R4(completion, "ProviderDispatchCompletionV2");
      const recoveryReceipt = buildInterruptedAttemptRecoveryReceiptV5R5({
        activeRunnerRegistrationHash: activeRegistration.selfHash,
        authorizationHash: authorization.selfHash,
        recoveryAuthorizationHash: recoveryAuthorization.selfHash,
        reservationHash: reservation.selfHash,
        requestArtifactHash: requestArtifact.selfHash,
        ledgerTerminalHashBeforeRecovery: entries.at(-1).selfHash,
        recoveredProviderEventReceiptHash: providerEventReceipt.selfHash,
        plannedLedgerCompletionHash: completion.selfHash,
        dispatchKnowledge: "UNCERTAIN_AFTER_RESERVATION",
        attemptBudgetConsumed: true,
        tokenAndUsdDisposition: "RESERVED_WORST_CASE_CONSUMED",
        recoveredBy,
        recoveredAt,
      });
      const receiptRelativePath = path.join("recovery", "interrupted-attempt-receipts", `${recoveryReceipt.selfHash}.json`);
      await atomicWriteProtectedJsonV5R4({ trustedRoot, relativePath: receiptRelativePath, value: recoveryReceipt });
      await append(completion);
      return Object.freeze({ recoveryReceipt, providerEventReceipt, completion, receiptRelativePath,
        providerSuccessCreated: false, providerCallMadeByRecovery: false, credentialReadMadeByRecovery: false });
    } finally { await held.release(); }
  }

  async function recoverStaleLock({ recoveryAuthorization, recoveredBy, recoveredAt = nowIso(clock), pidProbe = defaultPidProbe }) {
    assertClosedSelfHashedArtifactV5R5(recoveryAuthorization, "LedgerRecoveryAuthorizationV1");
    const lockPath = path.join(directory, LOCK_NAME);
    const lockBytes = await readExactRegularFile(lockPath);
    let lock;
    try { lock = JSON.parse(lockBytes); } catch { throw new Error("stale lock bytes are not canonical JSON and are unreviewable"); }
    requireCondition(`${canonicalJsonV5R3(lock)}\n` === lockBytes || canonicalJsonV5R3(lock) === lockBytes,
      "stale lock bytes are not canonical");
    const lockErrors = validateClosedSelfHashedArtifactV5R5(lock, "ExecutionLedgerLockV1");
    requireCondition(lockErrors.length === 0, `stale lock schema failed: ${lockErrors.join("; ")}`);
    const ledgerRelativePathHash = sha256V5R3(ledgerRelativePath);
    requireCondition(recoveryAuthorization.recoveryKind === "STALE_LOCK"
      && recoveryAuthorization.activeRunnerRegistrationHash === activeRegistration.selfHash
      && recoveryAuthorization.providerAuthorizationHash === authorization.selfHash
      && recoveryAuthorization.ledgerRelativePathHash === ledgerRelativePathHash
      && recoveryAuthorization.exactTargetHash === lock.selfHash
      && lock.activeRunnerRegistrationHash === activeRegistration.selfHash
      && lock.authorizationHash === authorization.selfHash && lock.ledgerRelativePathHash === ledgerRelativePathHash,
    "stale-lock recovery authorization or exact target binding is invalid");
    requireCondition(Date.parse(recoveredAt) >= Date.parse(recoveryAuthorization.issuedAt)
      && Date.parse(recoveredAt) < Date.parse(recoveryAuthorization.expiresAt), "stale-lock recovery authorization is expired or not yet valid");
    const alive = await pidProbe(lock.ownerPid);
    requireCondition(alive === false, "stale-lock recovery cannot proceed while the recorded owner PID may be alive");
    const { entries, errors } = await readEntries({ allowLock: true });
    requireCondition(errors.length === 0, `stale-lock ledger cannot be recovered because its chain is invalid: ${errors.join("; ")}`);
    const terminalHash = entries.at(-1)?.selfHash ?? sha256V5R3(canonicalJsonV5R3([]));
    const receipt = buildStaleLockRecoveryReceiptV5R5({
      activeRunnerRegistrationHash: activeRegistration.selfHash, authorizationHash: authorization.selfHash,
      lockBytesHash: sha256V5R3(Buffer.from(lockBytes, "utf8")), ledgerTerminalHash: terminalHash,
      lockOwnerPid: lock.ownerPid, lockOwnerAlive: false, lockNonce: lock.lockNonce,
      lockAcquiredAt: lock.acquiredAt, recoveredBy, recoveredAt,
    });
    const receiptRelativePath = path.join("recovery", "stale-lock-receipts", `${receipt.selfHash}.json`);
    await atomicWriteProtectedJsonV5R4({ trustedRoot, relativePath: receiptRelativePath, value: receipt });
    const unchangedBytes = await readExactRegularFile(lockPath);
    requireCondition(unchangedBytes === lockBytes, "stale lock changed after recovery receipt was persisted");
    const quarantineDirectory = await ensureProtectedDirectoryV5R4({ trustedRoot, relativePath: path.join("recovery", "stale-lock-quarantine") });
    const quarantinePath = path.join(quarantineDirectory, `${receipt.selfHash}-${lock.selfHash}.json`);
    await link(lockPath, quarantinePath);
    await chmod(quarantinePath, 0o600);
    await unlink(lockPath);
    await fsyncDirectory(directory);
    await fsyncDirectory(quarantineDirectory);
    return Object.freeze({ receipt, receiptRelativePath,
      quarantineRelativePath: path.relative(trustedRoot.root, quarantinePath), automaticRecoveryUsed: false });
  }

  async function verify() {
    const result = await readEntries();
    const metadata = await lstat(directory);
    if (metadata.isSymbolicLink() || !metadata.isDirectory() || (metadata.mode & 0o777) !== 0o700) {
      result.errors.push("R5 ledger directory is not a real 0700 directory");
    }
    return Object.freeze({ entries: Object.freeze(result.entries), errors: Object.freeze([...new Set(result.errors)]),
      accounting: accounting(result.entries) });
  }

  return Object.freeze({ reserve, complete, verify, recoverStaleLock, recoverInterruptedReservation, ledgerRelativePath });
}

export const ATOMIC_EXECUTION_LEDGER_V5_R5_CONSTANTS = Object.freeze({
  lockSchemaVersion: "ExecutionLedgerLockV1",
  automaticRecoveryAllowed: false,
  staleLockRecoveryRequiresExactOwnerAuthorization: true,
});
