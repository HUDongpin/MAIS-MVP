import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
  validateSelfHashV5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  assertClosedSelfHashedArtifactV5R11,
} from "./schema-contract-v5-r11.mjs";

const HASH = /^[0-9a-f]{64}$/u;

function requireCondition(condition, message) {
  if (!condition) throw new TypeError(message);
}

function reservationFor(input) {
  return (input.ledgerEntries ?? []).find(({ entryType, selfHash }) =>
    entryType === "DISPATCH_RESERVED" && selfHash === input.reservationHash) ?? null;
}

function exactOne(values, predicate, label) {
  const matches = (values ?? []).filter(predicate);
  requireCondition(matches.length <= 1, `R11 custody contains duplicate ${label}`);
  return matches[0] ?? null;
}

export function inspectInterruptedAttemptCustodyV5R11(input) {
  const reservation = reservationFor(input);
  requireCondition(reservation && validateSelfHashV5R3(reservation),
    "R11 custody inspection requires the exact sealed reservation");
  const intent = exactOne(input.attemptCommitIntents,
    (value) => value?.reservationHash === reservation.selfHash, "commit intent");
  const prepared = exactOne(input.preparedCompletions,
    (value) => value?.reservationHash === reservation.selfHash, "prepared completion");
  const completion = exactOne(input.ledgerEntries,
    (value) => value?.entryType === "DISPATCH_COMPLETED"
      && value?.reservationHash === reservation.selfHash, "ledger completion");
  const resolved = exactOne(input.resolvedAttemptReceipts,
    (value) => value?.reservationHash === reservation.selfHash, "resolved attempt receipt");
  if (resolved) {
    requireCondition(intent && completion
      && resolved.attemptCommitIntentHash === intent.selfHash
      && resolved.compatibilityCompletionHash === completion.selfHash,
    "R11 resolved receipt exists without its exact intent and completion lineage");
  }
  if (intent) {
    requireCondition(prepared && validateSelfHashV5R3(prepared)
      && intent.preparedCompletionHash === prepared.selfHash,
    "R11 durable intent lacks its exact retained prepared-completion bytes");
  }
  if (prepared) {
    requireCondition(validateSelfHashV5R3(prepared)
      && prepared.reservationHash === reservation.selfHash,
    "R11 prepared completion is not sealed or reservation-bound");
  }
  if (completion && !intent) {
    throw new TypeError("R11 completion exists without its durable pre-completion intent");
  }
  if (intent) {
    requireCondition(validateSelfHashV5R3(intent)
      && intent.reservationHash === reservation.selfHash,
    "R11 commit intent is not sealed or reservation-bound");
  }
  if (completion) requireCondition(validateSelfHashV5R3(completion),
    "R11 ledger completion is not sealed");
  if (resolved) requireCondition(validateSelfHashV5R3(resolved),
    "R11 resolved attempt receipt is not sealed");
  const state = !intent && !completion && !resolved ? "RESERVATION_WITHOUT_DURABLE_INTENT"
    : intent && !completion && !resolved ? "INTENT_WITHOUT_LEDGER_COMPLETION"
      : intent && completion && !resolved ? "COMPLETION_WITHOUT_RESOLVED_RECEIPT"
        : intent && completion && resolved ? "FULLY_RECONCILED"
          : "IMPOSSIBLE_CUSTODY_STATE";
  return Object.freeze({ state, reservation, prepared, intent, completion, resolved });
}

function validateAuthorization(input, custody) {
  const authorization = input.recoveryAuthorization;
  requireCondition(validateSelfHashV5R3(authorization)
    && authorization.schemaVersion === "AttemptCustodyReconciliationAuthorizationV1"
    && authorization.designId === "MAIS-NATURAL-CA60-V5",
  "R11 reconciliation requires a sealed owner authorization");
  requireCondition(authorization.activeRunnerRegistrationHash === input.activeRunnerRegistrationHash
    && authorization.providerAuthorizationHash === input.providerAuthorizationHash
    && authorization.reservationHash === custody.reservation.selfHash
    && authorization.recoveryScope === "EXACT_SINGLE_INTERRUPTED_ATTEMPT_ZERO_HTTP"
    && authorization.automaticRecoveryAuthorized === false
    && authorization.zeroHttpOnly === true
    && typeof authorization.authorizedBy === "string" && authorization.authorizedBy.length > 0
    && HASH.test(authorization.ownerAuthorizationTextHash ?? ""),
  "R11 reconciliation authorization does not bind the exact reservation and zero-HTTP scope");
  const at = Date.parse(input.at ?? "");
  const issued = Date.parse(authorization.issuedAt ?? "");
  const expires = Date.parse(authorization.expiresAt ?? "");
  requireCondition([at, issued, expires].every(Number.isFinite)
    && issued <= at && at < expires, "R11 reconciliation authorization is expired or not yet valid");
}

function exactRecoveredCompletion(input, custody) {
  const completion = input.recoveredCompletion;
  requireCondition(completion && validateSelfHashV5R3(completion)
    && completion.reservationHash === custody.reservation.selfHash
    && custody.intent?.preparedCompletionHash === completion.selfHash,
  "R11 recovered completion differs from the durable intent");
  return completion;
}

function exactRecoveredResolved(input, custody, completion) {
  const resolved = input.recoveredResolvedAttemptReceipt;
  requireCondition(resolved && validateSelfHashV5R3(resolved)
    && resolved.reservationHash === custody.reservation.selfHash
    && resolved.attemptCommitIntentHash === custody.intent?.selfHash
    && resolved.compatibilityCompletionHash === completion.selfHash,
  "R11 recovered resolved receipt differs from the exact intent/completion lineage");
  return resolved;
}

export function reconcileInterruptedAttemptV5R11(input) {
  // Deliberately never call input.transport. Recovery may only move already
  // durable bytes into a complete ledger/receipt lineage.
  const custody = inspectInterruptedAttemptCustodyV5R11(input);
  validateAuthorization(input, custody);
  const actions = [];
  let finalState = custody.state;
  let dispatchKnowledge;
  let resumeAllowed;
  let tokenAndUsdDisposition;
  if (custody.state === "RESERVATION_WITHOUT_DURABLE_INTENT") {
    dispatchKnowledge = "UNCERTAIN_AFTER_RESERVATION";
    tokenAndUsdDisposition = "RESERVED_WORST_CASE_CONSUMED";
    actions.push("PRESERVE_RESERVATION_AND_BLOCK_RESUME_PENDING_EXTERNAL_PROVIDER_DISPOSITION_EVIDENCE");
    resumeAllowed = false;
  } else if (custody.state === "INTENT_WITHOUT_LEDGER_COMPLETION") {
    const completion = exactRecoveredCompletion(input, custody);
    const resolved = exactRecoveredResolved(input, custody, completion);
    actions.push("APPEND_EXACT_INTENT_BOUND_COMPLETION", "APPEND_EXACT_RESOLVED_ATTEMPT_RECEIPT");
    finalState = "RECOVERED_COMPLETION_AND_RESOLVED_RECEIPT_PENDING_ATOMIC_APPEND";
    dispatchKnowledge = "COMPLETION_RECEIPT_RECOVERED";
    tokenAndUsdDisposition = "USE_RECOVERED_PROVIDER_RECEIPT";
    resumeAllowed = true;
    void resolved;
  } else if (custody.state === "COMPLETION_WITHOUT_RESOLVED_RECEIPT") {
    exactRecoveredResolved(input, custody, custody.completion);
    actions.push("APPEND_EXACT_RESOLVED_ATTEMPT_RECEIPT");
    finalState = "RECOVERED_RESOLVED_RECEIPT_PENDING_ATOMIC_APPEND";
    dispatchKnowledge = "COMPLETION_RECEIPT_RECOVERED";
    tokenAndUsdDisposition = "USE_RECOVERED_PROVIDER_RECEIPT";
    resumeAllowed = true;
  } else if (custody.state === "FULLY_RECONCILED") {
    actions.push("NO_MUTATION_CUSTODY_ALREADY_RECONCILED");
    dispatchKnowledge = "COMPLETION_RECEIPT_RECOVERED";
    tokenAndUsdDisposition = "USE_RECOVERED_PROVIDER_RECEIPT";
    resumeAllowed = true;
  } else {
    throw new TypeError("R11 custody state cannot be reconciled");
  }
  const receipt = assertClosedSelfHashedArtifactV5R11(sealV5R3Artifact({
    schemaVersion: "AttemptCustodyReconciliationReceiptV1",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash: input.activeRunnerRegistrationHash,
    providerAuthorizationHash: input.providerAuthorizationHash,
    recoveryAuthorizationHash: input.recoveryAuthorization.selfHash,
    reservationHash: custody.reservation.selfHash,
    requestArtifactHash: custody.reservation.requestArtifactHash,
    custodyStateBefore: custody.state,
    custodyStateAfterPlannedAppend: finalState,
    intentHash: custody.intent?.selfHash ?? null,
    completionHash: custody.completion?.selfHash ?? input.recoveredCompletion?.selfHash ?? null,
    resolvedAttemptReceiptHash: custody.resolved?.selfHash
      ?? input.recoveredResolvedAttemptReceipt?.selfHash ?? null,
    plannedActions: actions,
    dispatchKnowledge,
    attemptBudgetConsumed: true,
    tokenAndUsdDisposition,
    providerSuccessCreatedByRecovery: false,
    zeroHttpRecovery: true,
    httpRequestCount: 0,
    providerEventCount: 0,
    credentialReadCount: 0,
    naturalQuestionEgressCount: 0,
    resumeAllowedAfterPlannedAppend: resumeAllowed,
    recoveredBy: input.recoveryAuthorization.authorizedBy,
    recoveredAt: input.at,
  }), "AttemptCustodyReconciliationReceiptV1");
  return Object.freeze({
    receipt,
    plannedActions: Object.freeze(actions),
    httpRequestCount: 0,
    providerEventCount: 0,
    credentialReadCount: 0,
    naturalQuestionEgressCount: 0,
    resumeAllowedAfterPlannedAppend: resumeAllowed,
  });
}

export async function applyInterruptedAttemptReconciliationV5R11(input) {
  requireCondition(input?.transport === undefined && input?.credentialReader === undefined,
    "R11 reconciliation application forbids transport and credential dependencies");
  const planned = reconcileInterruptedAttemptV5R11(input);
  const custody = inspectInterruptedAttemptCustodyV5R11(input);
  const persisted = [];
  if (planned.plannedActions.includes("APPEND_EXACT_INTENT_BOUND_COMPLETION")) {
    requireCondition(typeof input?.ledger?.recoverIntentBoundCompletion === "function",
      "R11 reconciliation cannot append an intent-bound completion without the atomic ledger recovery API");
    requireCondition(validateSelfHashV5R3(input.ledgerRecoveryAuthorization)
      && input.ledgerRecoveryAuthorization.schemaVersion === "LedgerRecoveryAuthorizationV1"
      && input.ledgerRecoveryAuthorization.activeRunnerRegistrationHash
        === input.activeRunnerRegistrationHash
      && input.ledgerRecoveryAuthorization.providerAuthorizationHash
        === input.providerAuthorizationHash
      && input.ledgerRecoveryAuthorization.recoveryKind === "INTERRUPTED_RESERVATION"
      && input.ledgerRecoveryAuthorization.exactTargetHash === custody.intent.selfHash
      && input.ledgerRecoveryAuthorization.ownerAuthorizationTextHash
        === input.recoveryAuthorization.ownerAuthorizationTextHash
      && input.ledgerRecoveryAuthorization.automaticRecoveryAuthorized === false,
    "R11 atomic-ledger recovery authorization does not bind the same owner decision and exact intent");
    const result = await input.ledger.recoverIntentBoundCompletion({
      intent: custody.intent,
      preparedCompletion: input.recoveredCompletion,
      recoveryAuthorization: input.ledgerRecoveryAuthorization,
      recoveredAt: input.at,
    });
    requireCondition(result?.completion?.selfHash === input.recoveredCompletion.selfHash
      && result.providerCallMade === false,
    "R11 ledger recovery did not append the exact completion with zero provider activity");
    persisted.push(input.recoveredCompletion.selfHash);
  }
  if (planned.plannedActions.includes("APPEND_EXACT_RESOLVED_ATTEMPT_RECEIPT")) {
    requireCondition(typeof input?.resolvedAttemptReceiptStore?.append === "function",
      "R11 reconciliation cannot append the resolved receipt without an append-only store");
    const result = await input.resolvedAttemptReceiptStore.append(input.recoveredResolvedAttemptReceipt);
    requireCondition(result?.contentHash === input.recoveredResolvedAttemptReceipt.selfHash,
      "R11 resolved attempt receipt was not durably appended by exact hash");
    persisted.push(input.recoveredResolvedAttemptReceipt.selfHash);
  }
  requireCondition(typeof input?.reconciliationReceiptStore?.append === "function",
    "R11 reconciliation receipt requires an append-only public custody store");
  const receiptPersisted = await input.reconciliationReceiptStore.append(planned.receipt);
  requireCondition(receiptPersisted?.contentHash === planned.receipt.selfHash,
    "R11 reconciliation receipt was not durably appended by exact hash");
  persisted.push(planned.receipt.selfHash);
  return Object.freeze({
    ...planned,
    persistedArtifactHashes: Object.freeze(persisted),
    persistenceCompleted: true,
    providerEventCount: 0,
    httpRequestCount: 0,
    credentialReadCount: 0,
    naturalQuestionEgressCount: 0,
  });
}

export function validateResumeCustodyV5R11(input) {
  const errors = [];
  const reservations = (input.ledgerEntries ?? []).filter(({ entryType }) =>
    entryType === "DISPATCH_RESERVED");
  const reservationHashes = new Set(reservations.map(({ selfHash }) => selfHash));
  for (const reservation of reservations) {
    try {
      const custody = inspectInterruptedAttemptCustodyV5R11({ ...input,
        reservationHash: reservation.selfHash });
      if (custody.state !== "FULLY_RECONCILED") {
        errors.push(`${reservation.attemptId}: interrupted attempt requires zero-HTTP reconciliation before resume`);
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  for (const intent of input.attemptCommitIntents ?? []) {
    if (!reservationHashes.has(intent.reservationHash)) {
      errors.push(`${intent.attemptId ?? "unknown"}: orphan commit intent requires reconciliation`);
    }
  }
  for (const completion of (input.ledgerEntries ?? []).filter(({ entryType }) =>
    entryType === "DISPATCH_COMPLETED")) {
    if (!reservationHashes.has(completion.reservationHash)) {
      errors.push(`${completion.attemptId ?? "unknown"}: orphan ledger completion requires reconciliation`);
    }
  }
  for (const prepared of input.preparedCompletions ?? []) {
    if (!reservationHashes.has(prepared.reservationHash)) {
      errors.push(`${prepared.attemptId ?? "unknown"}: orphan prepared completion requires reconciliation`);
    }
  }
  for (const resolved of input.resolvedAttemptReceipts ?? []) {
    if (!reservationHashes.has(resolved.reservationHash)) {
      errors.push(`${resolved.attemptId ?? "unknown"}: orphan resolved receipt requires reconciliation`);
    }
  }
  return Object.freeze([...new Set(errors)]);
}

export function buildReconciliationAuthorizationV5R11(input) {
  return assertClosedSelfHashedArtifactV5R11(sealV5R3Artifact({
    schemaVersion: "AttemptCustodyReconciliationAuthorizationV1",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash: input.activeRunnerRegistrationHash,
    providerAuthorizationHash: input.providerAuthorizationHash,
    reservationHash: input.reservationHash,
    recoveryScope: "EXACT_SINGLE_INTERRUPTED_ATTEMPT_ZERO_HTTP",
    automaticRecoveryAuthorized: false,
    zeroHttpOnly: true,
    authorizedBy: input.authorizedBy,
    ownerAuthorizationTextHash: input.ownerAuthorizationTextHash,
    issuedAt: input.issuedAt,
    expiresAt: input.expiresAt,
  }), "AttemptCustodyReconciliationAuthorizationV1");
}

export function reconciliationEvidenceRootV5R11(receipts) {
  return sha256V5R3(canonicalJsonV5R3((receipts ?? []).map(({ selfHash }) => selfHash).sort()));
}

export const ATTEMPT_RECOVERY_V5_R11_CONSTANTS = Object.freeze({
  zeroHttpOnly: true,
  automaticRecoveryAllowed: false,
  resumeRequiresFullyReconciledCustody: true,
  crashInjectionPoints: Object.freeze([
    "AFTER_RESERVATION",
    "AFTER_DURABLE_INTENT",
    "AFTER_LEDGER_COMPLETION",
    "AFTER_RESOLVED_ATTEMPT_RECEIPT",
  ]),
});
