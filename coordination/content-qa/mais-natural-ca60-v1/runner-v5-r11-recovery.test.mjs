import assert from "node:assert/strict";
import test from "node:test";

import {
  sealV5R3Artifact,
  sha256V5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  applyInterruptedAttemptReconciliationV5R11,
  buildReconciliationAuthorizationV5R11,
  inspectInterruptedAttemptCustodyV5R11,
  reconcileInterruptedAttemptV5R11,
  validateResumeCustodyV5R11,
} from "./attempt-recovery-v5-r11.mjs";

const H = (value) => sha256V5R3(`r9-recovery-fixture:${value}`);
const ACTIVE = H("active-registration");
const AUTHORIZATION = H("provider-authorization");
const OWNER_TEXT = H("owner-reconciliation-authorization-text");
const AT = "2026-08-26T16:00:00.000Z";

function custodyFixture(state) {
  const reservation = sealV5R3Artifact({
    schemaVersion: "ProviderDispatchReservationV2",
    entryType: "DISPATCH_RESERVED",
    attemptId: "fixture-attempt-1",
    requestArtifactHash: H("request"),
    itemHash: H("item"),
    role: "B_PRIME_CRITIQUE",
  });
  const prepared = sealV5R3Artifact({
    schemaVersion: "ProviderDispatchCompletionV2",
    entryType: "DISPATCH_COMPLETED",
    attemptId: reservation.attemptId,
    reservationHash: reservation.selfHash,
  });
  const intent = sealV5R3Artifact({
    schemaVersion: "ProviderAttemptCommitIntentV1",
    activeRunnerRegistrationHash: ACTIVE,
    authorizationHash: AUTHORIZATION,
    attemptId: reservation.attemptId,
    reservationHash: reservation.selfHash,
    requestArtifactHash: reservation.requestArtifactHash,
    preparedCompletionHash: prepared.selfHash,
  });
  const resolved = sealV5R3Artifact({
    schemaVersion: "ResolvedProviderAttemptReceiptV2",
    activeRunnerRegistrationHash: ACTIVE,
    authorizationHash: AUTHORIZATION,
    attemptId: reservation.attemptId,
    reservationHash: reservation.selfHash,
    attemptCommitIntentHash: intent.selfHash,
    compatibilityCompletionHash: prepared.selfHash,
  });
  const includeIntent = ["AFTER_DURABLE_INTENT", "AFTER_LEDGER_COMPLETION",
    "AFTER_RESOLVED_ATTEMPT_RECEIPT"].includes(state);
  const includeCompletion = ["AFTER_LEDGER_COMPLETION",
    "AFTER_RESOLVED_ATTEMPT_RECEIPT"].includes(state);
  const includeResolved = state === "AFTER_RESOLVED_ATTEMPT_RECEIPT";
  const recoveryAuthorization = buildReconciliationAuthorizationV5R11({
    activeRunnerRegistrationHash: ACTIVE,
    providerAuthorizationHash: AUTHORIZATION,
    reservationHash: reservation.selfHash,
    authorizedBy: "FIXTURE_OWNER_NOT_LIVE_AUTHORITY",
    ownerAuthorizationTextHash: OWNER_TEXT,
    issuedAt: "2026-08-26T15:00:00.000Z",
    expiresAt: "2026-08-26T17:00:00.000Z",
  });
  const ledgerRecoveryAuthorization = sealV5R3Artifact({
    schemaVersion: "LedgerRecoveryAuthorizationV1",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash: ACTIVE,
    providerAuthorizationHash: AUTHORIZATION,
    ledgerRelativePathHash: H("ledger-path"),
    recoveryKind: "INTERRUPTED_RESERVATION",
    exactTargetHash: intent.selfHash,
    automaticRecoveryAuthorized: false,
    authorizedBy: "FIXTURE_OWNER_NOT_LIVE_AUTHORITY",
    ownerAuthorizationTextHash: OWNER_TEXT,
    issuedAt: "2026-08-26T15:00:00.000Z",
    expiresAt: "2026-08-26T17:00:00.000Z",
  });
  return {
    provider: "DEEPSEEK_DIRECT",
    activeRunnerRegistrationHash: ACTIVE,
    providerAuthorizationHash: AUTHORIZATION,
    reservationHash: reservation.selfHash,
    ledgerEntries: [reservation, ...(includeCompletion ? [prepared] : [])],
    preparedCompletions: includeIntent ? [prepared] : [],
    attemptCommitIntents: includeIntent ? [intent] : [],
    resolvedAttemptReceipts: includeResolved ? [resolved] : [],
    recoveryAuthorization,
    ledgerRecoveryAuthorization,
    recoveredCompletion: includeIntent ? prepared : null,
    recoveredResolvedAttemptReceipt: includeIntent ? resolved : null,
    at: AT,
    reservation,
    prepared,
    intent,
    resolved,
  };
}

test("R11 classifies all four registered crash-injection custody states deterministically", () => {
  const cases = [
    ["AFTER_RESERVATION", "RESERVATION_WITHOUT_DURABLE_INTENT"],
    ["AFTER_DURABLE_INTENT", "INTENT_WITHOUT_LEDGER_COMPLETION"],
    ["AFTER_LEDGER_COMPLETION", "COMPLETION_WITHOUT_RESOLVED_RECEIPT"],
    ["AFTER_RESOLVED_ATTEMPT_RECEIPT", "FULLY_RECONCILED"],
  ];
  for (const [injectionPoint, expected] of cases) {
    const input = custodyFixture(injectionPoint);
    assert.equal(inspectInterruptedAttemptCustodyV5R11(input).state, expected);
    assert.equal(validateResumeCustodyV5R11(input).length, expected === "FULLY_RECONCILED" ? 0 : 1);
  }
});

test("R11 reservation-only recovery preserves worst-case accounting and cannot authorize resume", () => {
  const input = custodyFixture("AFTER_RESERVATION");
  const recovered = reconcileInterruptedAttemptV5R11(input);
  assert.equal(recovered.resumeAllowedAfterPlannedAppend, false);
  assert.equal(recovered.receipt.dispatchKnowledge, "UNCERTAIN_AFTER_RESERVATION");
  assert.equal(recovered.receipt.tokenAndUsdDisposition, "RESERVED_WORST_CASE_CONSUMED");
  assert.deepEqual(recovered.plannedActions,
    ["PRESERVE_RESERVATION_AND_BLOCK_RESUME_PENDING_EXTERNAL_PROVIDER_DISPOSITION_EVIDENCE"]);
  assert.equal(recovered.httpRequestCount, 0);
  assert.equal(recovered.providerEventCount, 0);
  assert.equal(recovered.credentialReadCount, 0);
  assert.equal(recovered.naturalQuestionEgressCount, 0);
});

test("R11 intent-only recovery appends the exact prepared completion and resolved receipt with zero HTTP", async () => {
  const input = custodyFixture("AFTER_DURABLE_INTENT");
  const calls = [];
  const result = await applyInterruptedAttemptReconciliationV5R11({
    ...input,
    ledger: {
      recoverIntentBoundCompletion: async ({ intent, preparedCompletion }) => {
        calls.push(["LEDGER", intent.selfHash, preparedCompletion.selfHash]);
        return { completion: preparedCompletion, providerCallMade: false };
      },
    },
    resolvedAttemptReceiptStore: {
      append: async (value) => {
        calls.push(["RESOLVED", value.selfHash]);
        return { contentHash: value.selfHash };
      },
    },
    reconciliationReceiptStore: {
      append: async (value) => {
        calls.push(["RECONCILIATION", value.selfHash]);
        return { contentHash: value.selfHash };
      },
    },
  });
  assert.deepEqual(calls.map(([kind]) => kind), ["LEDGER", "RESOLVED", "RECONCILIATION"]);
  assert.equal(result.persistenceCompleted, true);
  assert.equal(result.resumeAllowedAfterPlannedAppend, true);
  assert.equal(result.httpRequestCount, 0);
  assert.equal(result.providerEventCount, 0);
  assert.equal(result.credentialReadCount, 0);
  assert.equal(result.naturalQuestionEgressCount, 0);
});

test("R11 completion-only recovery appends no second ledger completion", async () => {
  const input = custodyFixture("AFTER_LEDGER_COMPLETION");
  let ledgerCalls = 0;
  let resolvedCalls = 0;
  const result = await applyInterruptedAttemptReconciliationV5R11({
    ...input,
    ledger: { recoverIntentBoundCompletion: async () => { ledgerCalls += 1; } },
    resolvedAttemptReceiptStore: {
      append: async (value) => { resolvedCalls += 1; return { contentHash: value.selfHash }; },
    },
    reconciliationReceiptStore: {
      append: async (value) => ({ contentHash: value.selfHash }),
    },
  });
  assert.equal(ledgerCalls, 0);
  assert.equal(resolvedCalls, 1);
  assert.equal(result.resumeAllowedAfterPlannedAppend, true);
});

test("R11 fully reconciled recovery is idempotent apart from its append-only reconciliation receipt", async () => {
  const input = custodyFixture("AFTER_RESOLVED_ATTEMPT_RECEIPT");
  let mutationCalls = 0;
  let reconciliationCalls = 0;
  const result = await applyInterruptedAttemptReconciliationV5R11({
    ...input,
    ledger: { recoverIntentBoundCompletion: async () => { mutationCalls += 1; } },
    resolvedAttemptReceiptStore: {
      append: async () => { mutationCalls += 1; },
    },
    reconciliationReceiptStore: {
      append: async (value) => {
        reconciliationCalls += 1;
        return { contentHash: value.selfHash };
      },
    },
  });
  assert.equal(mutationCalls, 0);
  assert.equal(reconciliationCalls, 1);
  assert.deepEqual(result.plannedActions, ["NO_MUTATION_CUSTODY_ALREADY_RECONCILED"]);
  assert.equal(result.resumeAllowedAfterPlannedAppend, true);
});

test("R11 recovery rejects transport or credential dependencies before any action", async () => {
  const input = custodyFixture("AFTER_DURABLE_INTENT");
  await assert.rejects(() => applyInterruptedAttemptReconciliationV5R11({
    ...input,
    transport: { send: async () => null },
  }), /forbids transport and credential dependencies/iu);
});
