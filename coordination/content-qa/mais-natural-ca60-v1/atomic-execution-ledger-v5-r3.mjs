import { randomUUID } from "node:crypto";
import { chmod, mkdir, open, readFile, readdir, rename, stat, unlink } from "node:fs/promises";
import path from "node:path";

import {
  canonicalJsonV5R3,
  deriveProviderCostUsd,
  sealV5R3Artifact,
  validateSelfHashV5R3,
} from "./execution-integrity-v5-r3.mjs";

const ENTRY_PATTERN = /^(\d{8})-([0-9a-f]{64})\.json$/u;

async function fsyncDirectory(directory) {
  const handle = await open(directory, "r");
  try { await handle.sync(); } finally { await handle.close(); }
}

async function atomicWrite(directory, entry) {
  const filename = `${String(entry.sequenceNumber).padStart(8, "0")}-${entry.selfHash}.json`;
  const finalPath = path.join(directory, filename);
  const temporaryPath = path.join(directory, `.${filename}.${randomUUID()}.tmp`);
  const handle = await open(temporaryPath, "wx", 0o600);
  try {
    await handle.writeFile(canonicalJsonV5R3(entry), "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  await rename(temporaryPath, finalPath);
  await chmod(finalPath, 0o600);
  await fsyncDirectory(directory);
  return finalPath;
}

async function readEntries(root, { allowActiveLock = false } = {}) {
  const allNames = await readdir(root);
  const names = allNames.filter((name) => ENTRY_PATTERN.test(name)).sort();
  const entries = [];
  const errors = [];
  if (!allowActiveLock && allNames.includes(".ledger.lock")) errors.push("stale or active ledger lock requires fail-closed manual recovery");
  for (const name of allNames) {
    if (name.endsWith(".tmp")) errors.push(`${name} is an incomplete atomic entry requiring manual recovery`);
    else if (name !== ".ledger.lock" && !ENTRY_PATTERN.test(name)) errors.push(`${name} is an unexpected ledger file`);
  }
  for (const [index, name] of names.entries()) {
    const match = ENTRY_PATTERN.exec(name);
    const bytes = await readFile(path.join(root, name), "utf8");
    let entry;
    try { entry = JSON.parse(bytes); } catch { errors.push(`${name} is not valid JSON`); continue; }
    if (bytes !== canonicalJsonV5R3(entry)) errors.push(`${name} is not canonical JSON`);
    if (!validateSelfHashV5R3(entry)) errors.push(`${name} self-hash is invalid`);
    if (Number(match[1]) !== index + 1 || entry.sequenceNumber !== index + 1) errors.push(`${name} sequence is invalid`);
    if (match[2] !== entry.selfHash) errors.push(`${name} filename hash is invalid`);
    const expectedPrevious = index === 0 ? null : entries[index - 1]?.selfHash ?? null;
    if (entry.previousEntryHash !== expectedPrevious) errors.push(`${name} previous hash is invalid`);
    entries.push(entry);
  }
  return { entries, errors };
}

async function acquireLock(root) {
  const lockPath = path.join(root, ".ledger.lock");
  try {
    const handle = await open(lockPath, "wx", 0o600);
    await handle.writeFile("LOCKED\n", "utf8");
    await handle.sync();
    return async () => {
      await handle.close();
      await unlink(lockPath);
      await fsyncDirectory(root);
    };
  } catch (error) {
    if (error?.code === "EEXIST") throw new Error("execution ledger is busy; fail closed and resume later");
    throw error;
  }
}

function summary(entries) {
  const reservations = entries.filter((entry) => entry.entryType === "DISPATCH_RESERVED");
  const completions = entries.filter((entry) => entry.entryType === "DISPATCH_COMPLETED");
  const completedReservations = new Set(completions.map((entry) => entry.reservationHash));
  return {
    reservations,
    completions,
    active: reservations.filter((entry) => !completedReservations.has(entry.selfHash)),
    reservedInputTokens: reservations.reduce((total, entry) => total + entry.reservedInputTokens, 0),
    reservedOutputTokens: reservations.reduce((total, entry) => total + entry.reservedOutputTokens, 0),
    reservedTokens: reservations.reduce((total, entry) => total + entry.reservedTokens, 0),
    reservedUsd: reservations.reduce((total, entry) => total + entry.reservedUsd, 0),
    successes: completions.filter((entry) => entry.attemptStatus === "SUCCEEDED").length,
  };
}

export async function createAtomicExecutionLedgerV5R3({ root, authorization, priceSnapshot }) {
  if (!path.isAbsolute(root)) throw new TypeError("execution ledger root must be absolute");
  if (!validateSelfHashV5R3(authorization) || authorization.schemaVersion !== "ProviderAuthorizationV3") throw new TypeError("sealed ProviderAuthorizationV3 is required");
  if (!validateSelfHashV5R3(priceSnapshot) || authorization.priceSnapshotHash !== priceSnapshot.selfHash) throw new TypeError("authorization price snapshot binding is invalid");
  await mkdir(root, { recursive: true, mode: 0o700 });
  await chmod(root, 0o700);

  async function verify() {
    const result = await readEntries(root);
    const mode = (await stat(root)).mode & 0o777;
    if (mode !== 0o700) result.errors.push("execution ledger directory mode is not 0700");
    return Object.freeze({ entries: Object.freeze(result.entries), errors: Object.freeze(result.errors) });
  }

  async function reserve({ attemptId, role, itemHash, itemIdPseudonym, clusterId }) {
    const release = await acquireLock(root);
    try {
      const { entries, errors } = await readEntries(root, { allowActiveLock: true });
      if (errors.length > 0) throw new Error(`execution ledger integrity failed: ${errors.join("; ")}`);
      const totals = summary(entries);
      if (typeof attemptId !== "string" || attemptId.length === 0) throw new TypeError("attemptId is invalid");
      if (typeof clusterId !== "string" || clusterId.length === 0) throw new TypeError("clusterId is invalid");
      if (totals.reservations.some((entry) => entry.attemptId === attemptId)) throw new Error("duplicate attemptId is forbidden");
      const policy = authorization.roleReservationPolicy?.[role];
      if (!policy || !Number.isSafeInteger(policy.inputTokens) || !Number.isSafeInteger(policy.outputTokens)) throw new Error("role has no sealed token reservation policy");
      const roleAttempts = totals.reservations.filter((entry) => entry.role === role).length;
      if (totals.reservations.length >= authorization.maximumAttempts) throw new Error("authorization attempt cap exhausted");
      if (roleAttempts >= authorization.maximumAttemptsPerRole) throw new Error("authorization per-role attempt cap exhausted");
      if (totals.successes >= authorization.maximumSuccessfulCalls) throw new Error("authorization successful-call cap exhausted");
      if (totals.active.length >= authorization.concurrencyCap) throw new Error("authorization concurrency cap exhausted");
      const reservedTokens = policy.inputTokens + policy.outputTokens;
      const reservedUsd = deriveProviderCostUsd(policy, priceSnapshot);
      if (totals.reservedInputTokens + policy.inputTokens > authorization.maximumInputTokens) throw new Error("authorization input-token cap exhausted");
      if (totals.reservedOutputTokens + policy.outputTokens > authorization.maximumOutputTokens) throw new Error("authorization output-token cap exhausted");
      if (totals.reservedTokens + reservedTokens > authorization.maximumTokens) throw new Error("authorization token cap exhausted");
      if (Number((totals.reservedUsd + reservedUsd).toFixed(12)) > authorization.maximumEstimatedUsd) throw new Error("authorization USD cap exhausted");
      const body = {
        schemaVersion: "ProviderDispatchReservationV1",
        entryType: "DISPATCH_RESERVED",
        status: "RESERVED",
        sequenceNumber: entries.length + 1,
        previousEntryHash: entries.at(-1)?.selfHash ?? null,
        authorizationHash: authorization.selfHash,
        attemptId,
        role,
        itemHash,
        itemIdPseudonym,
        clusterId,
        sampleExecutionInventoryHash: authorization.sampleExecutionInventoryHash,
        reservedInputTokens: policy.inputTokens,
        reservedOutputTokens: policy.outputTokens,
        reservedTokens,
        reservedUsd,
        priceSnapshotHash: priceSnapshot.selfHash,
      };
      const reservation = sealV5R3Artifact(body);
      await atomicWrite(root, reservation);
      return reservation;
    } finally {
      await release();
    }
  }

  async function complete({ reservationHash, providerEventReceipt, attemptStatus }) {
    const release = await acquireLock(root);
    try {
      const { entries, errors } = await readEntries(root, { allowActiveLock: true });
      if (errors.length > 0) throw new Error(`execution ledger integrity failed: ${errors.join("; ")}`);
      const reservation = entries.find((entry) => entry.entryType === "DISPATCH_RESERVED" && entry.selfHash === reservationHash);
      if (!reservation) throw new Error("dispatch reservation is absent");
      if (entries.some((entry) => entry.entryType === "DISPATCH_COMPLETED" && entry.reservationHash === reservationHash)) throw new Error("dispatch reservation is already completed");
      if (!validateSelfHashV5R3(providerEventReceipt)
        || providerEventReceipt.schemaVersion !== "ProviderEventReceiptV3"
        || providerEventReceipt.reservationHash !== reservationHash
        || providerEventReceipt.attemptId !== reservation.attemptId) {
        throw new Error("provider event receipt does not bind the reservation");
      }
      const completion = sealV5R3Artifact({
        schemaVersion: "ProviderDispatchCompletionV1",
        entryType: "DISPATCH_COMPLETED",
        status: "COMPLETED",
        sequenceNumber: entries.length + 1,
        previousEntryHash: entries.at(-1)?.selfHash ?? null,
        authorizationHash: authorization.selfHash,
        reservationHash,
        providerEventReceiptHash: providerEventReceipt.selfHash,
        providerEventReceipt,
        attemptStatus,
      });
      await atomicWrite(root, completion);
      return completion;
    } finally {
      await release();
    }
  }

  return Object.freeze({ reserve, complete, verify, root });
}
