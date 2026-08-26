import INTENT_SCHEMA from "./schemas/ProviderAttemptCommitIntentV1.schema.json" with { type: "json" };
import RESOLVED_SCHEMA from "./schemas/ResolvedProviderAttemptReceiptV2.schema.json" with { type: "json" };

import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
} from "./execution-integrity-v5-r3.mjs";
import {
  validateClosedSelfHashedArtifactV5R7,
} from "./schema-contract-v5-r7.mjs";
import {
  assertClosedSelfHashedAgainstV5R5,
  validateClosedSelfHashedAgainstV5R5,
} from "./schema-contract-v5-r5.mjs";
import {
  validateRawResponseArtifactV5R6,
  validateRawResponseBindingReceiptV5R6,
} from "./raw-response-custody-v5-r6.mjs";

function requireCondition(condition, message) {
  if (!condition) throw new TypeError(message);
}

function isIso(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString() === value;
}

function validateCustodyInputs(input) {
  const errors = [
    ...validateClosedSelfHashedArtifactV5R7(input?.requestArtifact, "ProviderRequestArtifactV5"),
    ...validateClosedSelfHashedArtifactV5R7(input?.dispatchAudit,
      input?.dispatchAudit?.schemaVersion ?? "StateBoundDispatchAuditReceiptV2"),
    ...validateClosedSelfHashedArtifactV5R7(input?.reservation, "ProviderDispatchReservationV2"),
    ...validateClosedSelfHashedArtifactV5R7(input?.dispatchPermit,
      input?.dispatchPermit?.schemaVersion ?? "ProviderDispatchPermitV4"),
    ...validateClosedSelfHashedArtifactV5R7(input?.compatibilityDispatchPermit, "ProviderDispatchPermitV3"),
    ...validateRawResponseArtifactV5R6(input?.rawResponseArtifact),
    ...validateRawResponseBindingReceiptV5R6(input?.rawResponseBindingReceipt),
    ...validateClosedSelfHashedArtifactV5R7(input?.providerEventReceipt, "ProviderEventReceiptV4"),
    ...validateClosedSelfHashedArtifactV5R7(input?.preparedCompletion, "ProviderDispatchCompletionV2"),
  ];
  if (input?.roleOutput !== null) {
    errors.push(...validateClosedSelfHashedArtifactV5R7(input?.roleOutput, "ProviderRoleOutputV1"));
  }
  return [...new Set(errors)];
}

export function buildProviderAttemptCommitIntentV5R7(input) {
  const errors = validateCustodyInputs(input);
  requireCondition(errors.length === 0, errors.join("; "));
  const request = input.requestArtifact;
  const event = input.providerEventReceipt;
  const completion = input.preparedCompletion;
  const raw = input.rawResponseArtifact;
  const binding = input.rawResponseBindingReceipt;
  const roleOutputHash = input.roleOutput?.selfHash ?? null;
  requireCondition(input.rawAndBindingDurable === true
    && isIso(input.preparedAt)
    && Date.parse(input.preparedAt) >= Date.parse(event.finishedAt)
    && Date.parse(input.preparedAt) >= Date.parse(raw.capturedAt)
    && Date.parse(input.preparedAt) >= Date.parse(binding.boundAt)
    && request.activeRunnerRegistrationHash === input.activeRunnerRegistrationHash
    && request.authorizationHash === input.authorizationHash
    && request.attemptId === event.attemptId && request.attemptId === raw.attemptId
    && request.attemptId === binding.attemptId && request.attemptId === input.dispatchAudit.attemptId
    && request.itemHash === event.itemHash && request.itemHash === raw.itemHash
    && request.role === event.role && request.role === raw.role
    && input.reservation.selfHash === event.reservationHash
    && input.reservation.selfHash === completion.reservationHash
    && input.dispatchPermit.reservationHash === input.reservation.selfHash
    && input.dispatchPermit.requestArtifactHash === request.selfHash
    && (input.dispatchPermit.dispatchAuditHash ?? input.dispatchPermit.dispatchAuthorityHash)
      === input.dispatchAudit.selfHash
    && input.compatibilityDispatchPermit.selfHash === event.dispatchPermitHash
    && input.compatibilityDispatchPermit.reservationHash === input.reservation.selfHash
    && raw.selfHash === binding.rawResponseArtifactHash
    && raw.rawResponseBodyHash === binding.rawResponseBodyHash
    && event.selfHash === binding.providerEventReceiptHash
    && event.selfHash === completion.providerEventReceiptHash
    && roleOutputHash === binding.roleOutputHash && roleOutputHash === completion.roleOutputHash
    && completion.attemptStatus === event.attemptStatus,
  "attempt commit intent chronology or exact request/audit/reservation/raw/event/output/completion lineage is invalid");
  const receipt = sealV5R3Artifact({
    schemaVersion: "ProviderAttemptCommitIntentV1",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash: input.activeRunnerRegistrationHash,
    authorizationHash: input.authorizationHash,
    attemptId: request.attemptId,
    provider: request.provider,
    role: request.role,
    itemHash: request.itemHash,
    requestArtifactHash: request.selfHash,
    dispatchAuditHash: input.dispatchAudit.selfHash,
    reservationHash: input.reservation.selfHash,
    dispatchPermitHash: input.dispatchPermit.selfHash,
    compatibilityDispatchPermitHash: input.compatibilityDispatchPermit.selfHash,
    rawResponseArtifactHash: raw.selfHash,
    rawResponseBindingReceiptHash: binding.selfHash,
    providerEventReceiptHash: event.selfHash,
    roleOutputHash,
    preparedCompletionHash: completion.selfHash,
    attemptStatus: event.attemptStatus,
    rawAndBindingDurable: true,
    preparedCompletionNotYetCommitted: true,
    preparedAt: input.preparedAt,
  });
  assertClosedSelfHashedAgainstV5R5(receipt, INTENT_SCHEMA, receipt.schemaVersion);
  return receipt;
}

export function validateProviderAttemptCommitIntentV5R7({ intent, ...input }) {
  const errors = [...validateClosedSelfHashedAgainstV5R5(intent, INTENT_SCHEMA)];
  try {
    const rebuilt = buildProviderAttemptCommitIntentV5R7({ ...input, preparedAt: intent?.preparedAt });
    if (canonicalJsonV5R3(rebuilt) !== canonicalJsonV5R3(intent)) {
      errors.push("R7 attempt commit intent differs from exact pre-completion custody reconstruction");
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return Object.freeze([...new Set(errors)]);
}

export function buildResolvedProviderAttemptReceiptV5R7({ intent, committedCompletion, ...input }) {
  const intentErrors = validateProviderAttemptCommitIntentV5R7({ intent, ...input,
    preparedCompletion: input.preparedCompletion });
  requireCondition(intentErrors.length === 0, intentErrors.join("; "));
  requireCondition(validateClosedSelfHashedArtifactV5R7(committedCompletion,
    "ProviderDispatchCompletionV2").length === 0
    && committedCompletion.selfHash === input.preparedCompletion.selfHash
    && committedCompletion.selfHash === intent.preparedCompletionHash,
  "committed completion differs from the exact precommitted completion hash");
  const event = input.providerEventReceipt;
  const request = input.requestArtifact;
  const binding = input.rawResponseBindingReceipt;
  const receipt = sealV5R3Artifact({
    schemaVersion: "ResolvedProviderAttemptReceiptV2",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash: input.activeRunnerRegistrationHash,
    authorizationHash: input.authorizationHash,
    authenticatedRouteEvidenceHash: input.authenticatedRouteEvidenceHash,
    requestArtifactHash: request.selfHash,
    dispatchAuditHash: input.dispatchAudit.selfHash,
    reservationHash: input.reservation.selfHash,
    dispatchPermitHash: input.dispatchPermit.selfHash,
    compatibilityDispatchPermitHash: input.compatibilityDispatchPermit.selfHash,
    rawResponseArtifactHash: input.rawResponseArtifact.selfHash,
    rawResponseBindingReceiptHash: binding.selfHash,
    providerEventReceiptHash: event.selfHash,
    roleOutputHash: input.roleOutput?.selfHash ?? null,
    attemptCommitIntentHash: intent.selfHash,
    compatibilityCompletionHash: committedCompletion.selfHash,
    attemptId: request.attemptId,
    provider: request.provider,
    requestedModel: request.model,
    observedModel: event.observedModel,
    requestedEndpoint: request.endpoint,
    observedEndpoint: event.observedEndpoint,
    projectResidency: input.projectResidency,
    dataRegion: input.dataRegion,
    role: request.role,
    itemHash: request.itemHash,
    itemIdPseudonym: request.itemIdPseudonym,
    attemptStatus: event.attemptStatus,
    transportStatus: event.transportStatus,
    bodyReadStatus: event.bodyReadStatus,
    parseStatus: event.parseStatus,
    schemaStatus: event.schemaStatus,
    providerEventCount: event.providerEventCount,
    httpRequestCount: event.httpRequestCount,
    credentialReadCount: input.credentialReadCount,
    inputTokens: event.inputTokens,
    outputTokens: event.outputTokens,
    reasoningTokens: event.reasoningTokens,
    totalTokens: event.totalTokens,
    estimatedCostUsd: event.estimatedCostUsd,
    rawResponseRetainedInProtectedStorage: true,
    rawResponseIndependentlyReparsed: binding.independentReparseVerified,
    commitIntentPersistedBeforeCompletion: true,
    completionMatchesPreparedHash: true,
    completedAt: event.finishedAt,
  });
  assertClosedSelfHashedAgainstV5R5(receipt, RESOLVED_SCHEMA, receipt.schemaVersion);
  return receipt;
}

export function validateResolvedProviderAttemptReceiptV5R7({ resolvedAttemptReceipt, intent,
  committedCompletion, ...input }) {
  const errors = [...validateClosedSelfHashedAgainstV5R5(resolvedAttemptReceipt, RESOLVED_SCHEMA)];
  try {
    const rebuilt = buildResolvedProviderAttemptReceiptV5R7({ ...input, intent, committedCompletion });
    if (canonicalJsonV5R3(rebuilt) !== canonicalJsonV5R3(resolvedAttemptReceipt)) {
      errors.push("R7 resolved attempt receipt differs from complete two-phase custody reconstruction");
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return Object.freeze([...new Set(errors)]);
}

export async function commitProviderAttemptWithDurableIntentV5R7(input) {
  requireCondition(typeof input?.attemptCommitIntentStore?.append === "function"
    && typeof input?.ledger?.completeWithDurableIntent === "function"
    && typeof input?.resolvedAttemptReceiptStore?.append === "function",
  "R7 two-phase attempt commit requires append-only intent/final stores and an atomic intent-aware ledger");
  let intent = null;
  const committed = await input.ledger.completeWithDurableIntent({
    reservationHash: input.reservation.selfHash,
    providerEventReceipt: input.providerEventReceipt,
    roleOutput: input.roleOutput,
    persistIntent: async (preparedCompletion) => {
      intent = buildProviderAttemptCommitIntentV5R7({ ...input, preparedCompletion });
      const intentPersisted = await input.attemptCommitIntentStore.append(intent);
      requireCondition(intentPersisted?.contentHash === intent.selfHash,
        "attempt commit intent was not durably appended before compatibility completion");
      return Object.freeze({ intent, contentHash: intent.selfHash });
    },
  });
  const committedCompletion = committed?.completion;
  requireCondition(intent && committed?.intentHash === intent.selfHash
    && committedCompletion?.selfHash === intent.preparedCompletionHash,
  "compatibility ledger committed bytes differ from the durable precompletion intent");
  const resolvedAttemptReceipt = buildResolvedProviderAttemptReceiptV5R7({
    ...input,
    preparedCompletion: committedCompletion,
    intent,
    committedCompletion,
  });
  const finalPersisted = await input.resolvedAttemptReceiptStore.append(resolvedAttemptReceipt);
  requireCondition(finalPersisted?.contentHash === resolvedAttemptReceipt.selfHash,
    "resolved attempt receipt was not durably appended after the exact prepared completion");
  return Object.freeze({ intent, committedCompletion, resolvedAttemptReceipt,
    intentPersistedBeforeCompletion: true, completionMatchesPreparedHash: true });
}

export const ATTEMPT_TRANSACTION_V5_R7_CONSTANTS = Object.freeze({
  commitProtocol: "DURABLE_INTENT_THEN_EXACT_PREPARED_COMPLETION_THEN_FINAL_RESOLVED_RECEIPT",
  completionMayExistWithoutPriorOuterIntent: false,
  rawAndBindingRequiredBeforeIntent: true,
});
