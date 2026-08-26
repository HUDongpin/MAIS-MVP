import {
  sealV5R3Artifact,
} from "./execution-integrity-v5-r3.mjs";
import {
  assertClosedSelfHashedArtifactV5R5,
} from "./schema-contract-v5-r5.mjs";

const DISPATCH_KNOWLEDGE = new Set(["NEVER_DISPATCHED_PROVEN", "UNCERTAIN_AFTER_RESERVATION", "COMPLETION_RECEIPT_RECOVERED"]);
const RECOVERY_KINDS = new Set(["STALE_LOCK", "INTERRUPTED_RESERVATION"]);

function hash(value) { return typeof value === "string" && /^[0-9a-f]{64}$/u.test(value); }
function requireCondition(condition, message) { if (!condition) throw new TypeError(message); }
function iso(value) { return typeof value === "string" && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value; }

export function buildLedgerRecoveryAuthorizationV5R5(input) {
  for (const field of ["activeRunnerRegistrationHash", "providerAuthorizationHash", "ledgerRelativePathHash", "exactTargetHash", "ownerAuthorizationTextHash"]) {
    requireCondition(hash(input?.[field]), `recovery authorization ${field} is invalid`);
  }
  requireCondition(RECOVERY_KINDS.has(input.recoveryKind), "recovery authorization kind is invalid");
  requireCondition(input.automaticRecoveryAuthorized === false, "automatic recovery may not be authorized");
  requireCondition(typeof input.authorizedBy === "string" && input.authorizedBy.length > 0 && iso(input.issuedAt) && iso(input.expiresAt)
    && Date.parse(input.issuedAt) < Date.parse(input.expiresAt), "recovery authorization attribution or chronology is invalid");
  const authorization = sealV5R3Artifact({
    schemaVersion: "LedgerRecoveryAuthorizationV1",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash: input.activeRunnerRegistrationHash,
    providerAuthorizationHash: input.providerAuthorizationHash,
    ledgerRelativePathHash: input.ledgerRelativePathHash,
    recoveryKind: input.recoveryKind,
    exactTargetHash: input.exactTargetHash,
    automaticRecoveryAuthorized: false,
    authorizedBy: input.authorizedBy,
    ownerAuthorizationTextHash: input.ownerAuthorizationTextHash,
    issuedAt: input.issuedAt,
    expiresAt: input.expiresAt,
  });
  assertClosedSelfHashedArtifactV5R5(authorization, "LedgerRecoveryAuthorizationV1");
  return authorization;
}

export function buildInterruptedAttemptRecoveryReceiptV5R5(input) {
  for (const field of ["activeRunnerRegistrationHash", "authorizationHash", "recoveryAuthorizationHash", "reservationHash", "requestArtifactHash", "ledgerTerminalHashBeforeRecovery", "recoveredProviderEventReceiptHash", "plannedLedgerCompletionHash"]) {
    requireCondition(hash(input?.[field]), `recovery ${field} is invalid`);
  }
  requireCondition(DISPATCH_KNOWLEDGE.has(input.dispatchKnowledge), "recovery dispatch knowledge is invalid");
  requireCondition(input.attemptBudgetConsumed === true, "interrupted reservation must consume an attempt conservatively");
  const expectedTokenDisposition = input.dispatchKnowledge === "NEVER_DISPATCHED_PROVEN"
    ? "NO_PROVIDER_USAGE_PROVEN"
    : input.dispatchKnowledge === "COMPLETION_RECEIPT_RECOVERED"
      ? "USE_RECOVERED_PROVIDER_RECEIPT"
      : "RESERVED_WORST_CASE_CONSUMED";
  requireCondition(input.tokenAndUsdDisposition === expectedTokenDisposition, "recovery token/USD disposition is not conservative for the known dispatch state");
  requireCondition(typeof input.recoveredBy === "string" && input.recoveredBy.length > 0 && iso(input.recoveredAt), "recovery attribution or timestamp is invalid");
  const receipt = sealV5R3Artifact({
    schemaVersion: "InterruptedAttemptRecoveryReceiptV1",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash: input.activeRunnerRegistrationHash,
    authorizationHash: input.authorizationHash,
    recoveryAuthorizationHash: input.recoveryAuthorizationHash,
    reservationHash: input.reservationHash,
    requestArtifactHash: input.requestArtifactHash,
    ledgerTerminalHashBeforeRecovery: input.ledgerTerminalHashBeforeRecovery,
    recoveredProviderEventReceiptHash: input.recoveredProviderEventReceiptHash,
    plannedLedgerCompletionHash: input.plannedLedgerCompletionHash,
    dispatchKnowledge: input.dispatchKnowledge,
    attemptBudgetConsumed: true,
    tokenAndUsdDisposition: input.tokenAndUsdDisposition,
    providerSuccessCreated: false,
    requiresLedgerCompletion: true,
    ledgerCompletionAppendedAfterReceipt: true,
    resumeAllowedAfterLedgerCompletion: true,
    retrySubjectToSecondAttemptAndAllCaps: true,
    recoveredBy: input.recoveredBy,
    recoveredAt: input.recoveredAt,
  });
  assertClosedSelfHashedArtifactV5R5(receipt, "InterruptedAttemptRecoveryReceiptV1");
  return receipt;
}

export function buildStaleLockRecoveryReceiptV5R5(input) {
  for (const field of ["activeRunnerRegistrationHash", "authorizationHash", "lockBytesHash", "ledgerTerminalHash"]) requireCondition(hash(input?.[field]), `stale-lock ${field} is invalid`);
  requireCondition(Number.isSafeInteger(input.lockOwnerPid) && input.lockOwnerPid > 0 && input.lockOwnerAlive === false,
    "stale-lock recovery requires a recorded, demonstrably non-live owner PID");
  requireCondition(iso(input.lockAcquiredAt) && iso(input.recoveredAt) && Date.parse(input.recoveredAt) > Date.parse(input.lockAcquiredAt),
    "stale-lock recovery chronology is invalid");
  requireCondition(typeof input.lockNonce === "string" && input.lockNonce.length >= 16 && typeof input.recoveredBy === "string" && input.recoveredBy.length > 0,
    "stale-lock recovery identity is incomplete");
  const receipt = sealV5R3Artifact({
    schemaVersion: "StaleLedgerLockRecoveryReceiptV1",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash: input.activeRunnerRegistrationHash,
    authorizationHash: input.authorizationHash,
    ledgerTerminalHash: input.ledgerTerminalHash,
    lockBytesHash: input.lockBytesHash,
    lockOwnerPid: input.lockOwnerPid,
    lockOwnerAlive: false,
    lockNonce: input.lockNonce,
    lockAcquiredAt: input.lockAcquiredAt,
    recoveryAction: "MOVE_EXACT_LOCK_TO_APPEND_ONLY_QUARANTINE_AFTER_RECEIPT",
    automaticRecoveryAllowed: false,
    recoveredBy: input.recoveredBy,
    recoveredAt: input.recoveredAt,
  });
  assertClosedSelfHashedArtifactV5R5(receipt, "StaleLedgerLockRecoveryReceiptV1");
  return receipt;
}

export const RECOVERY_V5_R5_CONSTANTS = Object.freeze({
  dispatchKnowledgeStates: [...DISPATCH_KNOWLEDGE],
  automaticStaleLockRecoveryAllowed: false,
});
