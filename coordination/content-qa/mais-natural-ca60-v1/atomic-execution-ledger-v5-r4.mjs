import { constants } from "node:fs";
import { lstat, open, readdir, unlink } from "node:fs/promises";
import path from "node:path";

import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  validateSelfHashV5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  assertClosedSelfHashedArtifactV5R4,
  validateClosedSelfHashedArtifactV5R4,
} from "./schema-contract-v5-r4.mjs";
import {
  atomicWriteProtectedJsonV5R4,
  ensureProtectedDirectoryV5R4,
  readProtectedJsonV5R4,
} from "./protected-storage-v5-r4.mjs";
import { deriveReservedCostV5R4 } from "./route-authorization-v5-r4.mjs";

const ENTRY_PATTERN = /^(\d{8})-([0-9a-f]{64})\.json$/u;

async function acquireLock(directory) {
  const lockPath = path.join(directory, ".ledger.lock");
  const flags = constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (constants.O_NOFOLLOW ?? 0);
  let handle;
  try {
    handle = await open(lockPath, flags, 0o600);
    await handle.writeFile("LOCKED\n", "utf8");
    await handle.sync();
  } catch (error) {
    if (error?.code === "EEXIST") throw new Error("execution ledger is busy; fail closed and resume later");
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
  return new Map(entries.filter((entry) => entry.entryType === "DISPATCH_COMPLETED").map((entry) => [entry.reservationHash, entry]));
}

function accounting(entries) {
  const reservations = entries.filter((entry) => entry.entryType === "DISPATCH_RESERVED");
  const completions = completionByReservation(entries);
  const active = reservations.filter((reservation) => !completions.has(reservation.selfHash));
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
      // A local abort is an attempt, but it cannot consume provider tokens or USD.
      // Keep the immutable reservation in the receipt while releasing its budget.
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
  return Object.freeze({ reservations, completions, active, accountedInputTokens, accountedOutputTokens, accountedTokens, accountedUsd: Number(accountedUsd.toFixed(12)), successes });
}

export function validateExecutionLedgerEntriesV5R4({ entries, authorization, inventory }) {
  const errors = [];
  const reservations = new Map();
  const completed = new Set();
  const attemptIds = new Set();
  let previous = null;
  for (const [index, entry] of (entries ?? []).entries()) {
    const expectedSchema = entry?.entryType === "DISPATCH_RESERVED" ? "ProviderDispatchReservationV2" : "ProviderDispatchCompletionV2";
    errors.push(...validateClosedSelfHashedArtifactV5R4(entry, expectedSchema).map((error) => `ledger entry ${index + 1}: ${error}`));
    if (entry?.sequenceNumber !== index + 1 || entry?.previousEntryHash !== previous) errors.push(`ledger entry ${index + 1}: sequence or previous hash is invalid`);
    if (entry?.authorizationHash !== authorization?.selfHash) errors.push(`ledger entry ${index + 1}: authorization binding is invalid`);
    previous = entry?.selfHash ?? null;
    if (entry?.entryType === "DISPATCH_RESERVED") {
      if (reservations.has(entry.selfHash) || attemptIds.has(entry.attemptId)) errors.push(`ledger entry ${index + 1}: reservation or attempt ID is duplicated`);
      if (entry.sampleExecutionInventoryHash !== inventory?.selfHash || !inventory?.items?.some((item) => item.itemHash === entry.itemHash
        && item.itemIdPseudonym === entry.itemIdPseudonym && item.clusterId === entry.clusterId)) errors.push(`ledger entry ${index + 1}: item is outside the frozen inventory`);
      if (!authorization?.roleSet?.includes(entry.role)) errors.push(`ledger entry ${index + 1}: role is outside the authorization`);
      reservations.set(entry.selfHash, entry);
      attemptIds.add(entry.attemptId);
    } else if (entry?.entryType === "DISPATCH_COMPLETED") {
      const reservation = reservations.get(entry.reservationHash);
      if (!reservation || completed.has(entry.reservationHash)) errors.push(`ledger entry ${index + 1}: completion has no unique prior reservation`);
      const receipt = entry.providerEventReceipt;
      if (receipt?.selfHash !== entry.providerEventReceiptHash || receipt?.reservationHash !== reservation?.selfHash
        || receipt?.requestArtifactHash !== reservation?.requestArtifactHash || receipt?.attemptId !== reservation?.attemptId
        || receipt?.itemHash !== reservation?.itemHash || receipt?.role !== reservation?.role) errors.push(`ledger entry ${index + 1}: event receipt lineage is invalid`);
      if (entry.attemptStatus !== receipt?.attemptStatus) errors.push(`ledger entry ${index + 1}: completion status is not derived from the event receipt`);
      const localAbort = receipt?.transportStatus === "NOT_DISPATCHED" && receipt?.attemptStatus === "CREDENTIAL_UNAVAILABLE";
      if (receipt?.provider !== authorization?.provider || receipt?.requestedModel !== authorization?.model
        || receipt?.requestedEndpoint !== authorization?.endpoint
        || (localAbort ? receipt?.providerEventCount !== 0 || receipt?.httpRequestCount !== 0 : receipt?.providerEventCount !== 1 || receipt?.httpRequestCount !== 1)
        || (receipt?.attemptStatus === "SUCCEEDED" && (receipt?.observedModel !== authorization?.model || receipt?.observedEndpoint !== authorization?.endpoint))) {
        errors.push(`ledger entry ${index + 1}: provider event tuple or conservative event accounting is invalid`);
      }
      if (receipt?.reservedInputTokens !== reservation?.reservedInputTokens || receipt?.reservedOutputTokens !== reservation?.reservedOutputTokens
        || receipt?.reservedTokens !== reservation?.reservedTokens || receipt?.reservedCostUsd !== reservation?.reservedUsd
        || receipt?.priceSnapshotHash !== reservation?.priceSnapshotHash) errors.push(`ledger entry ${index + 1}: provider event reservation accounting differs from the atomic reservation`);
      const permitErrors = validateClosedSelfHashedArtifactV5R4(receipt?.dispatchPermit, "ProviderDispatchPermitV3");
      if (permitErrors.length > 0 || receipt?.dispatchPermitHash !== receipt?.dispatchPermit?.selfHash
        || receipt?.dispatchPermit?.reservationHash !== reservation?.selfHash
        || receipt?.dispatchPermit?.requestArtifactHash !== reservation?.requestArtifactHash
        || receipt?.dispatchPermit?.authorizationHash !== authorization?.selfHash
        || receipt?.dispatchPermit?.projectIdentityHash !== authorization?.projectIdentityHash
        || receipt?.projectIdentityHash !== authorization?.projectIdentityHash) {
        errors.push(`ledger entry ${index + 1}: dispatch permit evidence is invalid`);
      }
      if (receipt?.attemptStatus === "SUCCEEDED") {
        const roleErrors = validateClosedSelfHashedArtifactV5R4(entry.roleOutput, "ProviderRoleOutputV1");
        if (roleErrors.length > 0 || entry.roleOutputHash !== entry.roleOutput?.selfHash
          || entry.roleOutput?.attemptReceiptHash !== receipt.selfHash || entry.roleOutput?.itemHash !== reservation.itemHash
          || entry.roleOutput?.role !== reservation.role || entry.roleOutput?.requestArtifactHash !== reservation.requestArtifactHash
          || entry.roleOutput?.authorizationHash !== authorization?.selfHash || entry.roleOutput?.sampleExecutionInventoryHash !== inventory?.selfHash) {
          errors.push(`ledger entry ${index + 1}: successful role output lineage is invalid${roleErrors.length > 0 ? ` (${roleErrors.join("; ")})` : ""}`);
        }
      } else if (entry.roleOutput !== null || entry.roleOutputHash !== null) errors.push(`ledger entry ${index + 1}: failed attempt may not create a role output`);
      if (receipt?.usageSource === "PROVIDER_ENVELOPE" && (![receipt.inputTokens, receipt.outputTokens, receipt.reasoningTokens, receipt.totalTokens].every(Number.isSafeInteger)
        || receipt.inputTokens + receipt.outputTokens !== receipt.totalTokens || receipt.reasoningTokens > receipt.outputTokens)) {
        errors.push(`ledger entry ${index + 1}: provider usage envelope is incomplete or inconsistent`);
      }
      if (receipt?.usageSource === "UNAVAILABLE_RESERVED_WORST_CASE" && [receipt.inputTokens, receipt.outputTokens, receipt.reasoningTokens, receipt.totalTokens].some((value) => value !== null)) {
        errors.push(`ledger entry ${index + 1}: unavailable usage must retain null observed token fields`);
      }
      if (receipt?.usageSource === "PROVIDER_ENVELOPE" && (receipt.inputTokens > reservation?.reservedInputTokens
        || receipt.outputTokens > reservation?.reservedOutputTokens || receipt.totalTokens > reservation?.reservedTokens)
        && receipt.attemptStatus !== "CAP_INTEGRITY_FAILED") errors.push(`ledger entry ${index + 1}: observed usage exceeded reservation without a cap-integrity failure`);
      completed.add(entry.reservationHash);
    } else errors.push(`ledger entry ${index + 1}: entry type is invalid`);
  }
  const totals = accounting(entries ?? []);
  if (totals.reservations.length > (authorization?.maximumAttempts ?? -1)) errors.push("ledger exceeds the authorization attempt cap");
  if (totals.active.length > (authorization?.concurrencyCap ?? -1)) errors.push("ledger exceeds the authorization concurrency cap");
  if (totals.successes + totals.active.length > (authorization?.maximumSuccessfulCalls ?? -1)) errors.push("ledger exceeds reserved successful-call capacity");
  if (totals.accountedInputTokens > (authorization?.maximumInputTokens ?? -1)
    || totals.accountedOutputTokens > (authorization?.maximumOutputTokens ?? -1)
    || totals.accountedTokens > (authorization?.maximumTokens ?? -1)
    || totals.accountedUsd > (authorization?.maximumEstimatedUsd ?? -1)) errors.push("ledger exceeds an input/output/total-token or USD authorization cap");
  const itemRoleKeys = new Set(totals.reservations.map((entry) => `${entry.itemHash}:${entry.role}`));
  for (const key of itemRoleKeys) {
    const scoped = totals.reservations.filter((entry) => `${entry.itemHash}:${entry.role}` === key);
    if (scoped.length > (authorization?.maximumAttemptsPerItemRole ?? -1)) errors.push(`ledger item-role attempt cap exceeded for ${key}`);
    const successes = scoped.filter((entry) => totals.completions.get(entry.selfHash)?.attemptStatus === "SUCCEEDED");
    if (successes.length > 1) errors.push(`ledger contains multiple successful executions for ${key}`);
  }
  return Object.freeze([...new Set(errors)]);
}

export async function createAtomicExecutionLedgerV5R4({ trustedRoot, ledgerRelativePath, authorization, inventory, priceSnapshot }) {
  assertClosedSelfHashedArtifactV5R4(authorization, "ProviderAuthorizationV4");
  assertClosedSelfHashedArtifactV5R4(inventory, "SampleExecutionInventoryV2");
  assertClosedSelfHashedArtifactV5R4(priceSnapshot, "ProviderPriceSnapshotV2");
  if (authorization.sampleExecutionInventoryHash !== inventory.selfHash || authorization.priceSnapshotHash !== priceSnapshot.selfHash) throw new TypeError("ledger authorization does not bind inventory and price snapshot");
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
      if (Number(match[1]) !== index + 1 || match[2] !== entry.selfHash) errors.push(`${name}: filename sequence or hash is invalid`);
      entries.push(entry);
    }
    errors.push(...validateExecutionLedgerEntriesV5R4({ entries, authorization, inventory }));
    return { entries, errors };
  }

  async function append(entry) {
    const filename = `${String(entry.sequenceNumber).padStart(8, "0")}-${entry.selfHash}.json`;
    await atomicWriteProtectedJsonV5R4({ trustedRoot, relativePath: path.join(ledgerRelativePath, filename), value: entry });
  }

  async function reserve({ requestArtifact }) {
    assertClosedSelfHashedArtifactV5R4(requestArtifact, "ProviderRequestArtifactV4");
    if (requestArtifact.authorizationHash !== authorization.selfHash || requestArtifact.sampleExecutionInventoryHash !== inventory.selfHash) throw new Error("request does not bind this ledger authorization and inventory");
    const release = await acquireLock(directory);
    try {
      const { entries, errors } = await readEntries({ allowLock: true });
      if (errors.length > 0) throw new Error(`execution ledger integrity failed: ${errors.join("; ")}`);
      const totals = accounting(entries);
      if (totals.reservations.some((entry) => entry.attemptId === requestArtifact.attemptId)) throw new Error("duplicate attemptId is forbidden");
      const itemRoleAttempts = totals.reservations.filter((entry) => entry.itemHash === requestArtifact.itemHash && entry.role === requestArtifact.role);
      if (itemRoleAttempts.length >= authorization.maximumAttemptsPerItemRole) throw new Error("authorization per-item-role attempt cap exhausted");
      if (itemRoleAttempts.some((reservation) => totals.completions.get(reservation.selfHash)?.attemptStatus === "SUCCEEDED")) throw new Error("a successful item-role may not be executed again");
      if (totals.reservations.length >= authorization.maximumAttempts) throw new Error("authorization attempt cap exhausted");
      if (totals.successes + totals.active.length >= authorization.maximumSuccessfulCalls) throw new Error("authorization successful-call capacity exhausted");
      if (totals.active.length >= authorization.concurrencyCap) throw new Error("authorization concurrency cap exhausted");
      const reservedUsd = deriveReservedCostV5R4(requestArtifact, priceSnapshot);
      if (totals.accountedInputTokens + requestArtifact.reservedInputTokens > authorization.maximumInputTokens) throw new Error("authorization input-token cap exhausted");
      if (totals.accountedOutputTokens + requestArtifact.reservedOutputTokens > authorization.maximumOutputTokens) throw new Error("authorization output-token cap exhausted");
      if (totals.accountedTokens + requestArtifact.reservedTokens > authorization.maximumTokens) throw new Error("authorization total-token cap exhausted");
      if (Number((totals.accountedUsd + reservedUsd).toFixed(12)) > authorization.maximumEstimatedUsd) throw new Error("authorization USD cap exhausted");
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

  async function complete({ reservationHash, providerEventReceipt, roleOutput }) {
    assertClosedSelfHashedArtifactV5R4(providerEventReceipt, "ProviderEventReceiptV4");
    const release = await acquireLock(directory);
    try {
      const { entries, errors } = await readEntries({ allowLock: true });
      if (errors.length > 0) throw new Error(`execution ledger integrity failed: ${errors.join("; ")}`);
      const reservation = entries.find((entry) => entry.entryType === "DISPATCH_RESERVED" && entry.selfHash === reservationHash);
      if (!reservation || entries.some((entry) => entry.entryType === "DISPATCH_COMPLETED" && entry.reservationHash === reservationHash)) throw new Error("reservation is absent or already completed");
      if (providerEventReceipt.reservationHash !== reservation.selfHash || providerEventReceipt.authorizationHash !== authorization.selfHash
        || providerEventReceipt.requestArtifactHash !== reservation.requestArtifactHash || providerEventReceipt.attemptId !== reservation.attemptId
        || providerEventReceipt.projectIdentityHash !== authorization.projectIdentityHash
        || providerEventReceipt.dispatchPermit?.projectIdentityHash !== authorization.projectIdentityHash) {
        throw new Error("provider event receipt does not bind the reservation and provider subject identity");
      }
      if (providerEventReceipt.usageSource === "PROVIDER_ENVELOPE" && (providerEventReceipt.inputTokens > reservation.reservedInputTokens
        || providerEventReceipt.outputTokens > reservation.reservedOutputTokens || providerEventReceipt.totalTokens > reservation.reservedTokens)
        && providerEventReceipt.attemptStatus !== "CAP_INTEGRITY_FAILED") throw new Error("observed token usage exceeds the immutable reservation");
      const successful = providerEventReceipt.attemptStatus === "SUCCEEDED";
      if (successful) {
        assertClosedSelfHashedArtifactV5R4(roleOutput, "ProviderRoleOutputV1");
        if (roleOutput.attemptReceiptHash !== providerEventReceipt.selfHash || roleOutput.requestArtifactHash !== reservation.requestArtifactHash
          || roleOutput.authorizationHash !== authorization.selfHash || roleOutput.sampleExecutionInventoryHash !== inventory.selfHash
          || roleOutput.itemHash !== reservation.itemHash || roleOutput.role !== reservation.role) {
          throw new Error("successful role output is absent or does not bind the event receipt, request, authorization, and inventory");
        }
      }
      if (!successful && roleOutput !== null) throw new Error("failed attempt cannot create a role output");
      const completion = sealV5R3Artifact({
        schemaVersion: "ProviderDispatchCompletionV2",
        entryType: "DISPATCH_COMPLETED",
        status: "COMPLETED",
        sequenceNumber: entries.length + 1,
        previousEntryHash: entries.at(-1)?.selfHash ?? null,
        authorizationHash: authorization.selfHash,
        reservationHash: reservation.selfHash,
        providerEventReceiptHash: providerEventReceipt.selfHash,
        providerEventReceipt: structuredClone(providerEventReceipt),
        roleOutputHash: successful ? roleOutput.selfHash : null,
        roleOutput: successful ? structuredClone(roleOutput) : null,
        attemptStatus: providerEventReceipt.attemptStatus,
      });
      assertClosedSelfHashedArtifactV5R4(completion, "ProviderDispatchCompletionV2");
      await append(completion);
      return completion;
    } finally { await release(); }
  }

  async function verify() {
    const result = await readEntries();
    const metadata = await lstat(directory);
    if (metadata.isSymbolicLink() || !metadata.isDirectory() || (metadata.mode & 0o777) !== 0o700) result.errors.push("ledger directory is not a real 0700 directory");
    return Object.freeze({ entries: Object.freeze(result.entries), errors: Object.freeze([...new Set(result.errors)]), accounting: accounting(result.entries) });
  }

  return Object.freeze({ reserve, complete, verify, ledgerRelativePath });
}

export function resolveSuccessfulRoleOutputV5R4({ entries, authorization, inventory, itemHash, role }) {
  const errors = validateExecutionLedgerEntriesV5R4({ entries, authorization, inventory });
  if (errors.length > 0) throw new Error(`authoritative ledger cannot resolve prior role: ${errors.join("; ")}`);
  const successes = entries.filter((entry) => entry.entryType === "DISPATCH_COMPLETED" && entry.attemptStatus === "SUCCEEDED"
    && entry.roleOutput?.itemHash === itemHash && entry.roleOutput?.role === role);
  if (successes.length !== 1) throw new Error(`authoritative ledger requires exactly one successful ${role} output for the item`);
  return Object.freeze({ completion: successes[0], receipt: successes[0].providerEventReceipt, output: successes[0].roleOutput });
}

export function executionLedgerTerminalEvidenceV5R4(entries) {
  if (!Array.isArray(entries) || entries.length === 0 || entries.some((entry) => !validateSelfHashV5R3(entry))) throw new TypeError("ledger terminal evidence requires a nonempty self-hashed chain");
  return Object.freeze({
    entryCount: entries.length,
    terminalHash: entries.at(-1).selfHash,
    attemptChainHash: sealV5R3Artifact({ schemaVersion: "AttemptChainRootV1", entryHashes: entries.map(({ selfHash }) => selfHash) }).selfHash,
  });
}
