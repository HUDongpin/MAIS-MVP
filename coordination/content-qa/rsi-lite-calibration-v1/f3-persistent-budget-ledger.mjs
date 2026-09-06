import { randomUUID } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync
} from "node:fs";
import path from "node:path";

import { canonicalSha256, createBudgetLedger } from "./f3-formal-runner.mjs";

const SCHEMA_VERSION = "MAIS-F3-PERSISTENT-BUDGET-LEDGER-V1";
const LOCK_SCHEMA_VERSION = "MAIS-F3-PERSISTENT-BUDGET-WRITER-LEASE-V1";
const ACQUISITION_GUARD_SCHEMA_VERSION = "MAIS-F3-PERSISTENT-BUDGET-LEASE-ACQUISITION-GUARD-V1";

function finiteNonnegative(value, label) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} must be a finite non-negative number.`);
  return value;
}

function positiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${label} must be a positive safe integer.`);
  return value;
}

function stableEqual(left, right) {
  return canonicalSha256(left) === canonicalSha256(right);
}

function usageCost({ promptCacheHitTokens, promptCacheMissTokens, outputTokens }, prices) {
  return Number(((
    promptCacheHitTokens * prices.inputCacheHit
    + promptCacheMissTokens * prices.inputCacheMiss
    + outputTokens * prices.output
  ) / 1_000_000).toFixed(9));
}

function normalizedCommittedUsage(usage = {}) {
  const providerCalls = finiteNonnegative(usage.providerCalls ?? 0, "committed provider calls");
  return {
    providerCalls,
    providerAttempts: finiteNonnegative(usage.providerAttempts ?? providerCalls, "committed provider attempts"),
    promptCacheHitTokens: finiteNonnegative(usage.promptCacheHitTokens ?? 0, "committed cache-hit tokens"),
    promptCacheMissTokens: finiteNonnegative(usage.promptCacheMissTokens ?? 0, "committed cache-miss tokens"),
    outputTokens: finiteNonnegative(usage.outputTokens ?? 0, "committed output tokens"),
    apiCostUsd: finiteNonnegative(usage.apiCostUsd ?? 0, "committed API cost"),
    conservativeFailureDebitTokens: finiteNonnegative(usage.conservativeFailureDebitTokens ?? 0, "committed conservative failure tokens"),
    conservativeFailureDebitUsd: finiteNonnegative(usage.conservativeFailureDebitUsd ?? 0, "committed conservative failure cost")
  };
}

function normalizedPriorDebit(value = {}) {
  return {
    providerCalls: finiteNonnegative(value.providerCalls ?? 0, "prior uncommitted provider calls"),
    tokens: finiteNonnegative(value.tokens ?? 0, "prior uncommitted failure tokens"),
    usd: finiteNonnegative(value.usd ?? 0, "prior uncommitted failure cost")
  };
}

function validateJournal(stored, { binding, caps, pricesUsdPerMillion, maxUncommittedProviderCalls }) {
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) throw new Error("Persistent F3 budget journal is not an object.");
  const { journalSha256, ...body } = stored;
  if (journalSha256 !== canonicalSha256(body)) throw new Error("Persistent F3 budget journal self-hash is invalid.");
  if (stored.schemaVersion !== SCHEMA_VERSION) throw new Error("Persistent F3 budget journal schema drifted.");
  positiveInteger(stored.generation, "persistent F3 budget journal generation");
  if (!stableEqual(stored.binding, binding)) throw new Error("Persistent F3 budget journal authorization binding drifted.");
  if (!stableEqual(stored.caps, caps) || !stableEqual(stored.pricesUsdPerMillion, pricesUsdPerMillion)) throw new Error("Persistent F3 budget journal cap or price binding drifted.");
  if (stored.maxUncommittedProviderCalls !== maxUncommittedProviderCalls) throw new Error("Persistent F3 budget journal uncommitted-call slack drifted.");
  if (!Array.isArray(stored.activeReservations)) throw new Error("Persistent F3 budget journal active reservations are invalid.");
}

function processIsAlive(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return true;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code !== "ESRCH";
  }
}

function acquireWriterLease({ lockPath, binding }) {
  const token = randomUUID();
  const bindingSha256 = canonicalSha256(binding);
  const lockBody = {
    schemaVersion: LOCK_SCHEMA_VERSION,
    pid: process.pid,
    token,
    bindingSha256
  };
  const payload = { ...lockBody, lockSha256: canonicalSha256(lockBody) };
  const acquisitionGuardPath = `${lockPath}.acquire`;
  const acquisitionGuardToken = randomUUID();
  const acquisitionGuardBody = {
    schemaVersion: ACQUISITION_GUARD_SCHEMA_VERSION,
    pid: process.pid,
    token: acquisitionGuardToken,
    bindingSha256
  };
  const acquisitionGuardPayload = {
    ...acquisitionGuardBody,
    guardSha256: canonicalSha256(acquisitionGuardBody)
  };

  function writeLease() {
    writeFileSync(lockPath, `${JSON.stringify(payload, null, 2)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
    chmodSync(lockPath, 0o600);
  }

  function acquireGuard() {
    try {
      writeFileSync(acquisitionGuardPath, `${JSON.stringify(acquisitionGuardPayload, null, 2)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
      chmodSync(acquisitionGuardPath, 0o600);
    } catch (error) {
      if (error?.code === "EEXIST") {
        throw new Error("Persistent F3 writer acquisition guard already exists; refusing concurrent or ambiguous lease recovery.");
      }
      throw error;
    }
  }

  function releaseGuard() {
    let current;
    try {
      current = JSON.parse(readFileSync(acquisitionGuardPath, "utf8"));
    } catch {
      throw new Error("Persistent F3 writer acquisition guard disappeared before protected lease acquisition completed.");
    }
    const { guardSha256, ...currentBody } = current;
    if (
      guardSha256 !== canonicalSha256(currentBody)
      || current.schemaVersion !== ACQUISITION_GUARD_SCHEMA_VERSION
      || current.pid !== process.pid
      || current.token !== acquisitionGuardToken
      || current.bindingSha256 !== bindingSha256
    ) throw new Error("Persistent F3 writer acquisition guard ownership changed during lease acquisition.");
    unlinkSync(acquisitionGuardPath);
  }

  let acquisitionError = null;
  let leaseAcquired = false;
  acquireGuard();
  try {
    try {
      writeLease();
      leaseAcquired = true;
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      let existingText;
      let existing;
      try {
        existingText = readFileSync(lockPath, "utf8");
        existing = JSON.parse(existingText);
      } catch {
        throw new Error("Persistent F3 writer lease is unreadable; refusing unsafe stale-lock recovery.");
      }
      const { lockSha256, ...existingBody } = existing;
      if (lockSha256 !== canonicalSha256(existingBody) || existing.schemaVersion !== LOCK_SCHEMA_VERSION) {
        throw new Error("Persistent F3 writer lease is invalid; refusing unsafe stale-lock recovery.");
      }
      if (existing.bindingSha256 !== bindingSha256) throw new Error("Persistent F3 writer lease belongs to a different authorization binding.");
      if (processIsAlive(existing.pid)) throw new Error(`Persistent F3 active writer lease already exists for pid ${existing.pid}.`);
      const quarantinePath = `${lockPath}.stale-${existing.pid}-${randomUUID()}`;
      try {
        renameSync(lockPath, quarantinePath);
      } catch {
        throw new Error("Persistent F3 stale writer lease changed during guarded recovery; refusing to race another writer.");
      }
      if (readFileSync(quarantinePath, "utf8") !== existingText) {
        throw new Error("Persistent F3 quarantined writer lease differs from the guarded stale lease.");
      }
      try {
        writeLease();
        leaseAcquired = true;
      } catch {
        throw new Error("Persistent F3 writer lease could not be acquired after guarded stale-lock quarantine.");
      }
    }
  } catch (error) {
    acquisitionError = error;
  }
  try {
    releaseGuard();
  } catch (error) {
    acquisitionError ??= error;
  }
  if (acquisitionError) throw acquisitionError;
  if (!leaseAcquired) throw new Error("Persistent F3 writer lease acquisition ended without a protected lease.");

  let closed = false;
  function assertHeld() {
    if (closed) throw new Error("Persistent F3 writer lease is closed.");
    let current;
    try {
      current = JSON.parse(readFileSync(lockPath, "utf8"));
    } catch {
      throw new Error("Persistent F3 writer lease disappeared while the ledger was active.");
    }
    const { lockSha256, ...currentBody } = current;
    if (
      lockSha256 !== canonicalSha256(currentBody)
      || current.schemaVersion !== LOCK_SCHEMA_VERSION
      || current.token !== token
      || current.pid !== process.pid
      || current.bindingSha256 !== bindingSha256
    ) {
      throw new Error("Persistent F3 writer lease ownership changed while the ledger was active.");
    }
  }

  return Object.freeze({
    assertHeld,
    close() {
      if (closed) return;
      assertHeld();
      unlinkSync(lockPath);
      closed = true;
    }
  });
}

export function createPersistentF3BudgetLedger({
  journalPath,
  binding,
  caps,
  pricesUsdPerMillion,
  committedUsage,
  priorUncommittedDebit = {},
  maxUncommittedProviderCalls
}) {
  if (!path.isAbsolute(journalPath)) throw new Error("Persistent F3 budget journal path must be absolute.");
  if (!binding || typeof binding !== "object" || Array.isArray(binding)) throw new Error("Persistent F3 budget journal binding is required.");
  positiveInteger(maxUncommittedProviderCalls, "maximum uncommitted provider calls");
  const normalizedCommitted = normalizedCommittedUsage(committedUsage);
  const normalizedPrior = normalizedPriorDebit(priorUncommittedDebit);
  mkdirSync(path.dirname(journalPath), { recursive: true, mode: 0o700 });
  const writerLease = acquireWriterLease({ lockPath: `${journalPath}.writer.lock`, binding });

  try {
  let usage;
  let activeReservations;
  let recoveredActiveReservationCount = 0;
  let generation = 0;
  let observedJournalSha256 = null;
  if (existsSync(journalPath)) {
    const stored = JSON.parse(readFileSync(journalPath, "utf8"));
    validateJournal(stored, { binding, caps, pricesUsdPerMillion, maxUncommittedProviderCalls });
    generation = stored.generation;
    observedJournalSha256 = stored.journalSha256;
    usage = structuredClone(stored.usage);
    activeReservations = structuredClone(stored.activeReservations);
    recoveredActiveReservationCount = finiteNonnegative(stored.recoveredActiveReservationCount ?? 0, "recovered active-reservation count");
    for (const row of activeReservations) {
      usage.conservativeFailureDebitTokens += row.maxInputTokens + row.maxOutputTokens;
      usage.conservativeFailureDebitUsd = Number((usage.conservativeFailureDebitUsd + row.worstCostUsd).toFixed(9));
      recoveredActiveReservationCount += 1;
    }
    activeReservations = [];
    if (usage.providerCalls < normalizedCommitted.providerAttempts) throw new Error("Persistent F3 budget journal undercounts newly committed provider attempts.");
    for (const key of ["promptCacheHitTokens", "promptCacheMissTokens", "outputTokens", "apiCostUsd", "conservativeFailureDebitTokens", "conservativeFailureDebitUsd"]) {
      if (usage[key] < normalizedCommitted[key]) throw new Error(`Persistent F3 budget journal undercounts committed ${key}.`);
    }
  } else {
    usage = {
      providerCalls: normalizedCommitted.providerAttempts + normalizedPrior.providerCalls,
      promptCacheHitTokens: normalizedCommitted.promptCacheHitTokens,
      promptCacheMissTokens: normalizedCommitted.promptCacheMissTokens,
      outputTokens: normalizedCommitted.outputTokens,
      apiCostUsd: normalizedCommitted.apiCostUsd,
      conservativeFailureDebitTokens: normalizedCommitted.conservativeFailureDebitTokens + normalizedPrior.tokens,
      conservativeFailureDebitUsd: Number((normalizedCommitted.conservativeFailureDebitUsd + normalizedPrior.usd).toFixed(9))
    };
    activeReservations = [];
  }

  let committedProviderCalls = normalizedCommitted.providerCalls;
  const base = createBudgetLedger({ caps, pricesUsdPerMillion, initialUsage: usage });
  const activeById = new Map(activeReservations.map((row) => [row.id, row]));

  function body(nextGeneration) {
    return {
      schemaVersion: SCHEMA_VERSION,
      generation: nextGeneration,
      binding: structuredClone(binding),
      caps: structuredClone(caps),
      pricesUsdPerMillion: structuredClone(pricesUsdPerMillion),
      maxUncommittedProviderCalls,
      committedProviderCalls,
      recoveredActiveReservationCount,
      usage: (() => {
        const { activeReservations: _activeCount, ...current } = base.snapshot();
        return current;
      })(),
      activeReservations: [...activeById.values()].sort((left, right) => left.id.localeCompare(right.id)),
      productionAuthorized: false,
      deploymentAuthorized: false,
      gitCommitAuthorized: false,
      gitPushAuthorized: false
    };
  }

  function persist() {
    writerLease.assertHeld();
    if (observedJournalSha256 === null) {
      if (existsSync(journalPath)) throw new Error("Persistent F3 journal compare-and-swap failed: an unexpected generation appeared.");
    } else {
      let current;
      try {
        current = JSON.parse(readFileSync(journalPath, "utf8"));
      } catch {
        throw new Error("Persistent F3 journal compare-and-swap failed: the observed generation is unreadable.");
      }
      if (current.journalSha256 !== observedJournalSha256 || current.generation !== generation) {
        throw new Error("Persistent F3 journal compare-and-swap failed: generation or self-hash changed.");
      }
    }
    const nextGeneration = generation + 1;
    const currentBody = body(nextGeneration);
    const payload = { ...currentBody, journalSha256: canonicalSha256(currentBody) };
    const temporaryPath = `${journalPath}.${process.pid}.${randomUUID()}.tmp`;
    writeFileSync(temporaryPath, `${JSON.stringify(payload, null, 2)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
    chmodSync(temporaryPath, 0o600);
    renameSync(temporaryPath, journalPath);
    chmodSync(journalPath, 0o600);
    generation = nextGeneration;
    observedJournalSha256 = payload.journalSha256;
    return payload;
  }

  function uncommittedProviderCalls() {
    return base.snapshot().providerCalls - committedProviderCalls;
  }

  persist();

  return Object.freeze({
    reserve({ maxInputTokens, maxOutputTokens }) {
      writerLease.assertHeld();
      if (uncommittedProviderCalls() + 1 > maxUncommittedProviderCalls) {
        throw new Error(`Persistent F3 uncommitted provider-call slack would be exceeded (${uncommittedProviderCalls() + 1} > ${maxUncommittedProviderCalls}).`);
      }
      const reservation = base.reserve({ maxInputTokens, maxOutputTokens });
      const worstCostUsd = usageCost({ promptCacheHitTokens: 0, promptCacheMissTokens: maxInputTokens, outputTokens: maxOutputTokens }, pricesUsdPerMillion);
      activeById.set(reservation.id, { id: reservation.id, maxInputTokens, maxOutputTokens, worstCostUsd });
      persist();
      return reservation;
    },
    settleSuccess(reservation, providerUsage) {
      writerLease.assertHeld();
      if (!activeById.has(reservation.id)) throw new Error("Persistent F3 budget journal does not contain the provider reservation.");
      const result = base.settleSuccess(reservation, providerUsage);
      activeById.delete(reservation.id);
      persist();
      return result;
    },
    settleFailure(reservation) {
      writerLease.assertHeld();
      const row = activeById.get(reservation.id);
      if (!row) throw new Error("Persistent F3 budget journal does not contain the provider reservation.");
      base.settleFailure(reservation);
      activeById.delete(reservation.id);
      persist();
      return {
        providerCalls: 1,
        conservativeFailureDebitTokens: row.maxInputTokens + row.maxOutputTokens,
        conservativeFailureDebitUsd: row.worstCostUsd
      };
    },
    reconcileCommittedUsage(nextCommittedUsage) {
      writerLease.assertHeld();
      const normalized = normalizedCommittedUsage(nextCommittedUsage);
      const current = base.snapshot();
      if (normalized.providerCalls < committedProviderCalls || normalized.providerAttempts > current.providerCalls) throw new Error("Persistent F3 committed provider-call reconciliation is invalid.");
      committedProviderCalls = normalized.providerCalls;
      persist();
    },
    snapshot() {
      writerLease.assertHeld();
      return base.snapshot();
    },
    auditSnapshot() {
      const stored = persist();
      return {
        schemaVersion: stored.schemaVersion,
        binding: stored.binding,
        usage: stored.usage,
        committedProviderCalls,
        uncommittedProviderCalls: uncommittedProviderCalls(),
        activeReservations: activeById.size,
        recoveredActiveReservationCount,
        maxUncommittedProviderCalls,
        generation: stored.generation,
        journalSha256: stored.journalSha256
      };
    },
    close() {
      writerLease.close();
    }
  });
  } catch (error) {
    try {
      writerLease.close();
    } catch {
      // Preserve the original initialization error; an invalid lease remains fail-closed.
    }
    throw error;
  }
}
