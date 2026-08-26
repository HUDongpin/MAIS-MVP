import { constants } from "node:fs";
import { lstat, open, readdir, unlink } from "node:fs/promises";
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

const ENTRY_PATTERN = /^(\d{8})-([0-9a-f]{64})\.json$/u;

function requireCondition(condition, message) {
  if (!condition) throw new TypeError(message);
}

async function acquireLock(directory) {
  const lockPath = path.join(directory, ".ledger.lock");
  const flags = constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (constants.O_NOFOLLOW ?? 0);
  let handle;
  try {
    handle = await open(lockPath, flags, 0o600);
    await handle.writeFile("LOCKED\n", "utf8");
    await handle.sync();
  } catch (error) {
    if (error?.code === "EEXIST") throw new Error("R7 execution ledger is busy; fail closed and resume later");
    throw error;
  }
  return async () => {
    await handle.close();
    await unlink(lockPath);
    const directoryHandle = await open(directory, constants.O_RDONLY);
    try { await directoryHandle.sync(); } finally { await directoryHandle.close(); }
  };
}

function completionByReservation(entries) {
  return new Map(entries.filter(({ entryType }) => entryType === "DISPATCH_COMPLETED")
    .map((entry) => [entry.reservationHash, entry]));
}

function accounting(entries) {
  const reservations = entries.filter(({ entryType }) => entryType === "DISPATCH_RESERVED");
  const completions = completionByReservation(entries);
  const active = reservations.filter(({ selfHash }) => !completions.has(selfHash));
  let accountedInputTokens = 0;
  let accountedOutputTokens = 0;
  let accountedTokens = 0;
  let accountedUsd = 0;
  let successes = 0;
  for (const reservation of reservations) {
    const completion = completions.get(reservation.selfHash);
    const receipt = completion?.providerEventReceipt;
    if (!completion) {
      accountedInputTokens += reservation.reservedInputTokens;
      accountedOutputTokens += reservation.reservedOutputTokens;
      accountedTokens += reservation.reservedTokens;
      accountedUsd += reservation.reservedUsd;
    } else if (receipt.providerEventCount === 0 && receipt.httpRequestCount === 0) {
      // A local abort consumes an attempt but no provider token or USD allowance.
    } else if (receipt.usageSource === "PROVIDER_ENVELOPE") {
      accountedInputTokens += receipt.inputTokens;
      accountedOutputTokens += receipt.outputTokens;
      accountedTokens += receipt.totalTokens;
      accountedUsd += receipt.estimatedCostUsd;
    } else {
      accountedInputTokens += reservation.reservedInputTokens;
      accountedOutputTokens += reservation.reservedOutputTokens;
      accountedTokens += reservation.reservedTokens;
      accountedUsd += reservation.reservedUsd;
    }
    if (completion?.attemptStatus === "SUCCEEDED") successes += 1;
  }
  return Object.freeze({ reservations, completions, active, accountedInputTokens, accountedOutputTokens,
    accountedTokens, accountedUsd: Number(accountedUsd.toFixed(12)), successes });
}

function validateCompletionInputs({ reservation, providerEventReceipt, roleOutput, authorization, inventory }) {
  assertClosedSelfHashedArtifactV5R4(providerEventReceipt, "ProviderEventReceiptV4");
  requireCondition(providerEventReceipt.reservationHash === reservation.selfHash
    && providerEventReceipt.authorizationHash === authorization.selfHash
    && providerEventReceipt.requestArtifactHash === reservation.requestArtifactHash
    && providerEventReceipt.attemptId === reservation.attemptId
    && providerEventReceipt.projectIdentityHash === authorization.projectIdentityHash
    && providerEventReceipt.dispatchPermit?.projectIdentityHash === authorization.projectIdentityHash,
  "R7 provider event does not bind the exact reservation and provider subject");
  const successful = providerEventReceipt.attemptStatus === "SUCCEEDED";
  if (successful) {
    assertClosedSelfHashedArtifactV5R4(roleOutput, "ProviderRoleOutputV1");
    requireCondition(roleOutput.attemptReceiptHash === providerEventReceipt.selfHash
      && roleOutput.requestArtifactHash === reservation.requestArtifactHash
      && roleOutput.authorizationHash === authorization.selfHash
      && roleOutput.sampleExecutionInventoryHash === inventory.selfHash
      && roleOutput.itemHash === reservation.itemHash && roleOutput.role === reservation.role,
    "R7 successful role output does not bind the event, request, authorization, inventory, item, and role");
  } else requireCondition(roleOutput === null, "R7 failed attempt cannot create a role output");
}

function buildCompletion(entries, reservation, providerEventReceipt, roleOutput) {
  return sealV5R3Artifact({
    schemaVersion: "ProviderDispatchCompletionV2",
    entryType: "DISPATCH_COMPLETED",
    status: "COMPLETED",
    sequenceNumber: entries.length + 1,
    previousEntryHash: entries.at(-1)?.selfHash ?? null,
    authorizationHash: providerEventReceipt.authorizationHash,
    reservationHash: reservation.selfHash,
    providerEventReceiptHash: providerEventReceipt.selfHash,
    providerEventReceipt: structuredClone(providerEventReceipt),
    roleOutputHash: roleOutput?.selfHash ?? null,
    roleOutput: roleOutput ? structuredClone(roleOutput) : null,
    attemptStatus: providerEventReceipt.attemptStatus,
  });
}

export async function createAtomicExecutionLedgerV5R7({
  trustedRoot,
  ledgerRelativePath,
  authorization,
  inventory,
  priceSnapshot,
}) {
  assertClosedSelfHashedArtifactV5R4(authorization, "ProviderAuthorizationV4");
  assertClosedSelfHashedArtifactV5R4(inventory, "SampleExecutionInventoryV2");
  assertClosedSelfHashedArtifactV5R4(priceSnapshot, "ProviderPriceSnapshotV2");
  requireCondition(authorization.sampleExecutionInventoryHash === inventory.selfHash
    && authorization.priceSnapshotHash === priceSnapshot.selfHash,
  "R7 ledger authorization does not bind inventory and price snapshot");
  const directory = await ensureProtectedDirectoryV5R4({ trustedRoot, relativePath: ledgerRelativePath });

  async function readEntries({ allowLock = false } = {}) {
    const names = await readdir(directory);
    const errors = [];
    if (!allowLock && names.includes(".ledger.lock")) errors.push("active or stale ledger lock requires fail-closed recovery");
    for (const name of names) {
      if (name.endsWith(".tmp")) errors.push(`${name}: incomplete atomic write requires recovery`);
      else if (name !== ".ledger.lock" && !ENTRY_PATTERN.test(name)) errors.push(`${name}: unexpected ledger file`);
    }
    const entries = [];
    for (const [index, name] of names.filter((name) => ENTRY_PATTERN.test(name)).sort().entries()) {
      const entry = await readProtectedJsonV5R4({ trustedRoot, relativePath: path.join(ledgerRelativePath, name) });
      const match = ENTRY_PATTERN.exec(name);
      if (Number(match[1]) !== index + 1 || match[2] !== entry.selfHash) {
        errors.push(`${name}: filename sequence or hash is invalid`);
      }
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
      && requestArtifact.sampleExecutionInventoryHash === inventory.selfHash,
    "R7 request does not bind this ledger authorization and inventory");
    const release = await acquireLock(directory);
    try {
      const { entries, errors } = await readEntries({ allowLock: true });
      requireCondition(errors.length === 0, `R7 execution ledger integrity failed: ${errors.join("; ")}`);
      const totals = accounting(entries);
      requireCondition(!totals.reservations.some(({ attemptId }) => attemptId === requestArtifact.attemptId),
        "duplicate attemptId is forbidden");
      const scoped = totals.reservations.filter((entry) => entry.itemHash === requestArtifact.itemHash
        && entry.role === requestArtifact.role);
      requireCondition(scoped.length < authorization.maximumAttemptsPerItemRole
        && !scoped.some(({ selfHash }) => totals.completions.get(selfHash)?.attemptStatus === "SUCCEEDED"),
      "R7 item-role attempt cap is exhausted or already succeeded");
      requireCondition(totals.reservations.length < authorization.maximumAttempts
        && totals.successes + totals.active.length < authorization.maximumSuccessfulCalls
        && totals.active.length < authorization.concurrencyCap,
      "R7 attempt, successful-call, or concurrency capacity is exhausted");
      const reservedUsd = deriveReservedCostV5R4(requestArtifact, priceSnapshot);
      requireCondition(totals.accountedInputTokens + requestArtifact.reservedInputTokens <= authorization.maximumInputTokens
        && totals.accountedOutputTokens + requestArtifact.reservedOutputTokens <= authorization.maximumOutputTokens
        && totals.accountedTokens + requestArtifact.reservedTokens <= authorization.maximumTokens
        && Number((totals.accountedUsd + reservedUsd).toFixed(12)) <= authorization.maximumEstimatedUsd,
      "R7 token or USD capacity is exhausted");
      const reservation = sealV5R3Artifact({
        schemaVersion: "ProviderDispatchReservationV2",
        entryType: "DISPATCH_RESERVED",
        status: "RESERVED",
        sequenceNumber: entries.length + 1,
        previousEntryHash: entries.at(-1)?.selfHash ?? null,
        authorizationHash: authorization.selfHash,
        requestArtifactHash: requestArtifact.selfHash,
        attemptId: requestArtifact.attemptId,
        role: requestArtifact.role,
        itemHash: requestArtifact.itemHash,
        itemIdPseudonym: requestArtifact.itemIdPseudonym,
        clusterId: requestArtifact.clusterId,
        sampleExecutionInventoryHash: inventory.selfHash,
        reservedInputTokens: requestArtifact.reservedInputTokens,
        reservedOutputTokens: requestArtifact.reservedOutputTokens,
        reservedTokens: requestArtifact.reservedTokens,
        reservedUsd,
        priceSnapshotHash: priceSnapshot.selfHash,
      });
      assertClosedSelfHashedArtifactV5R4(reservation, "ProviderDispatchReservationV2");
      await append(reservation);
      return reservation;
    } finally { await release(); }
  }

  async function completeWithDurableIntent({ reservationHash, providerEventReceipt, roleOutput, persistIntent }) {
    requireCondition(typeof persistIntent === "function", "R7 completion requires a durable intent callback");
    const release = await acquireLock(directory);
    try {
      const { entries, errors } = await readEntries({ allowLock: true });
      requireCondition(errors.length === 0, `R7 execution ledger integrity failed: ${errors.join("; ")}`);
      const reservation = entries.find((entry) => entry.entryType === "DISPATCH_RESERVED"
        && entry.selfHash === reservationHash);
      requireCondition(reservation && !entries.some((entry) => entry.entryType === "DISPATCH_COMPLETED"
        && entry.reservationHash === reservationHash), "R7 reservation is absent or already completed");
      validateCompletionInputs({ reservation, providerEventReceipt, roleOutput, authorization, inventory });
      const completion = buildCompletion(entries, reservation, providerEventReceipt, roleOutput);
      assertClosedSelfHashedArtifactV5R4(completion, "ProviderDispatchCompletionV2");
      const persisted = await persistIntent(completion);
      requireCondition(/^[0-9a-f]{64}$/u.test(persisted?.contentHash ?? "")
        && persisted?.intent?.preparedCompletionHash === completion.selfHash
        && persisted.contentHash === persisted.intent.selfHash,
      "R7 durable attempt intent does not bind the exact prepared completion");
      await append(completion);
      return Object.freeze({ completion, intentHash: persisted.intent.selfHash });
    } finally { await release(); }
  }

  async function recoverIntentBoundCompletion({ intent, preparedCompletion, recoveryAuthorization, recoveredAt }) {
    const authErrors = validateClosedSelfHashedArtifactV5R5(recoveryAuthorization,
      "LedgerRecoveryAuthorizationV1");
    requireCondition(authErrors.length === 0 && recoveryAuthorization.recoveryKind === "INTERRUPTED_RESERVATION"
      && recoveryAuthorization.activeRunnerRegistrationHash === intent.activeRunnerRegistrationHash
      && recoveryAuthorization.providerAuthorizationHash === authorization.selfHash
      && recoveryAuthorization.ledgerRelativePathHash === sha256V5R3(ledgerRelativePath)
      && recoveryAuthorization.exactTargetHash === intent.selfHash
      && recoveryAuthorization.automaticRecoveryAuthorized === false
      && Date.parse(recoveredAt) >= Date.parse(recoveryAuthorization.issuedAt)
      && Date.parse(recoveredAt) < Date.parse(recoveryAuthorization.expiresAt),
    "R7 prepared-completion recovery lacks exact unexpired owner authorization");
    requireCondition(intent.preparedCompletionHash === preparedCompletion.selfHash,
      "R7 recovery completion differs from the durable intent");
    const release = await acquireLock(directory);
    try {
      const { entries, errors } = await readEntries({ allowLock: true });
      requireCondition(errors.length === 0, `R7 execution ledger integrity failed: ${errors.join("; ")}`);
      const existing = entries.find((entry) => entry.selfHash === preparedCompletion.selfHash);
      if (existing) return Object.freeze({ completion: existing, alreadyCommitted: true, providerCallMade: false });
      requireCondition(preparedCompletion.sequenceNumber === entries.length + 1
        && preparedCompletion.previousEntryHash === (entries.at(-1)?.selfHash ?? null),
      "R7 recovery cannot insert an intent-bound completion after ledger order advanced");
      assertClosedSelfHashedArtifactV5R4(preparedCompletion, "ProviderDispatchCompletionV2");
      await append(preparedCompletion);
      return Object.freeze({ completion: preparedCompletion, alreadyCommitted: false, providerCallMade: false });
    } finally { await release(); }
  }

  async function verify() {
    const result = await readEntries();
    const metadata = await lstat(directory);
    if (metadata.isSymbolicLink() || !metadata.isDirectory() || (metadata.mode & 0o777) !== 0o700) {
      result.errors.push("R7 ledger directory is not a real 0700 directory");
    }
    return Object.freeze({ entries: Object.freeze(result.entries), errors: Object.freeze([...new Set(result.errors)]),
      accounting: accounting(result.entries) });
  }

  return Object.freeze({ reserve, completeWithDurableIntent, recoverIntentBoundCompletion, verify,
    ledgerRelativePath, commitProtocol: "DURABLE_INTENT_CALLBACK_INSIDE_EXCLUSIVE_LEDGER_LOCK" });
}

export const ATOMIC_EXECUTION_LEDGER_V5_R7_CONSTANTS = Object.freeze({
  intentPersistedInsideExclusiveLockBeforeCompletionAppend: true,
  recoveryRequiresExactOwnerAuthorization: true,
  automaticRecoveryAllowed: false,
});
