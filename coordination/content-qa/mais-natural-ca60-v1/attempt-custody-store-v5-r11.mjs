import { readdir } from "node:fs/promises";
import path from "node:path";

import {
  canonicalJsonV5R3,
  validateSelfHashV5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  atomicWriteProtectedJsonV5R4,
  ensureProtectedDirectoryV5R4,
  readProtectedJsonV5R4,
} from "./protected-storage-v5-r4.mjs";

const HASH = /^[0-9a-f]{64}$/u;
const FILES = Object.freeze({
  preparedCompletion: "prepared-completion.json",
  attemptCommitIntent: "attempt-commit-intent.json",
  resolvedAttemptReceipt: "resolved-attempt-receipt.json",
  reconciliationReceipt: "reconciliation-receipt.json",
});

function requireCondition(condition, message) {
  if (!condition) throw new TypeError(message);
}

function baseRelativePath(provider, authorizationHash) {
  requireCondition(["OPENAI_DIRECT", "DEEPSEEK_DIRECT"].includes(provider)
    && HASH.test(authorizationHash ?? ""),
  "R11 attempt custody store requires a provider and authorization hash");
  return path.join("runtime-custody-v5-r11", "attempts", provider.toLowerCase(), authorizationHash);
}

function artifactRelativePath(provider, authorizationHash, reservationHash, kind) {
  requireCondition(HASH.test(reservationHash ?? "") && FILES[kind],
    "R11 attempt custody path requires an exact reservation and artifact kind");
  return path.join(baseRelativePath(provider, authorizationHash), reservationHash, FILES[kind]);
}

async function appendExact(trustedRoot, relativePath, value) {
  requireCondition(validateSelfHashV5R3(value), "R11 attempt custody artifact is not self-hashed");
  try {
    const existing = await readProtectedJsonV5R4({ trustedRoot, relativePath });
    requireCondition(canonicalJsonV5R3(existing) === canonicalJsonV5R3(value),
      "R11 append-only attempt custody path already contains different canonical bytes");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    await atomicWriteProtectedJsonV5R4({ trustedRoot, relativePath, value });
  }
  const reloaded = await readProtectedJsonV5R4({ trustedRoot, relativePath });
  requireCondition(canonicalJsonV5R3(reloaded) === canonicalJsonV5R3(value),
    "R11 attempt custody artifact did not reload exactly after append");
  return Object.freeze({ contentHash: value.selfHash, relativePath });
}

async function readOptional(trustedRoot, relativePath) {
  try { return await readProtectedJsonV5R4({ trustedRoot, relativePath }); }
  catch (error) { if (error?.code === "ENOENT") return null; throw error; }
}

export async function createAttemptCustodyStoreV5R11({ trustedRoot, provider, authorizationHash }) {
  const root = baseRelativePath(provider, authorizationHash);
  await ensureProtectedDirectoryV5R4({ trustedRoot, relativePath: root });
  const append = (kind, value, reservationHash = value?.reservationHash) => appendExact(trustedRoot,
    artifactRelativePath(provider, authorizationHash, reservationHash, kind), value);
  return Object.freeze({
    provider,
    authorizationHash,
    root,
    preparedCompletionStore: Object.freeze({ append: (value) =>
      append("preparedCompletion", value) }),
    attemptCommitIntentStore: Object.freeze({ append: (value) =>
      append("attemptCommitIntent", value) }),
    resolvedAttemptReceiptStore: Object.freeze({ append: (value) =>
      append("resolvedAttemptReceipt", value) }),
    reconciliationReceiptStore: Object.freeze({ append: (value) =>
      append("reconciliationReceipt", value, value.reservationHash) }),
    async loadReservation(reservationHash) {
      const entries = {};
      for (const kind of Object.keys(FILES)) {
        entries[kind] = await readOptional(trustedRoot,
          artifactRelativePath(provider, authorizationHash, reservationHash, kind));
      }
      return Object.freeze(entries);
    },
    async enumerateReservationDirectories() {
      let names = [];
      try { names = await readdir(path.join(trustedRoot.root, root)); }
      catch (error) { if (error?.code !== "ENOENT") throw error; }
      requireCondition(names.every((name) => HASH.test(name)),
        "R11 attempt custody root contains an unexpected reservation directory");
      return Object.freeze([...names].sort());
    },
  });
}

export async function reloadAttemptCustodyStoreV5R11({ trustedRoot, provider,
  authorizationHash, ledgerEntries }) {
  const store = await createAttemptCustodyStoreV5R11({ trustedRoot, provider, authorizationHash });
  const reservations = (ledgerEntries ?? []).filter(({ entryType }) => entryType === "DISPATCH_RESERVED");
  const reservationHashes = new Set(reservations.map(({ selfHash }) => selfHash));
  const directoryHashes = await store.enumerateReservationDirectories();
  const orphanDirectoryHashes = directoryHashes.filter((hash) => !reservationHashes.has(hash));
  const preparedCompletions = [];
  const attemptCommitIntents = [];
  const resolvedAttemptReceipts = [];
  const reconciliationReceipts = [];
  for (const reservation of reservations) {
    const loaded = await store.loadReservation(reservation.selfHash);
    if (loaded.preparedCompletion) preparedCompletions.push(loaded.preparedCompletion);
    if (loaded.attemptCommitIntent) attemptCommitIntents.push(loaded.attemptCommitIntent);
    if (loaded.resolvedAttemptReceipt) resolvedAttemptReceipts.push(loaded.resolvedAttemptReceipt);
    if (loaded.reconciliationReceipt) reconciliationReceipts.push(loaded.reconciliationReceipt);
  }
  return Object.freeze({ store, preparedCompletions: Object.freeze(preparedCompletions),
    attemptCommitIntents: Object.freeze(attemptCommitIntents),
    resolvedAttemptReceipts: Object.freeze(resolvedAttemptReceipts),
    reconciliationReceipts: Object.freeze(reconciliationReceipts),
    orphanDirectoryHashes: Object.freeze(orphanDirectoryHashes) });
}

export const ATTEMPT_CUSTODY_STORE_V5_R11_CONSTANTS = Object.freeze({
  fixedByReservationPaths: true,
  preparedCompletionBytesRetainedBeforeLedgerCompletion: true,
  appendOnlyMode: "0600",
  callerSuppliedRecoveryBytesAccepted: false,
});
