import {
  sealV5R3Artifact,
} from "./execution-integrity-v5-r3.mjs";
import {
  validateProviderActivationV5R10,
} from "./activation-guard-v5-r10.mjs";
import {
  validateAndRebuildProviderRequestArtifactV5R6,
} from "./provider-request-v5-r6.mjs";
import {
  buildRawResponseBindingReceiptV5R6,
  independentlyReparseRawResponseV5R6,
} from "./raw-response-custody-v5-r6.mjs";
import {
  commitProviderAttemptWithDurableIntentV5R10,
} from "./attempt-transaction-v5-r10.mjs";
import {
  buildProviderDispatchPermitV5R10,
  buildReferenceDispatchAuthorityV5R10,
  validateDispatchAuthorityV5R10,
  validateProviderDispatchPermitV5R10,
  validateReferenceDispatchAuthorityV5R10,
} from "./dispatch-authority-v5-r10.mjs";
import {
  assertClosedSelfHashedArtifactV5R10,
} from "./schema-contract-v5-r10.mjs";
import {
  createNativeProviderAdapterV5R10,
  NATIVE_PROVIDER_ADAPTER_V5_R10_CONSTANTS,
} from "./native-provider-adapter-v5-r10.mjs";

export {
  buildProviderDispatchPermitV5R10,
  buildReferenceDispatchAuthorityV5R10,
  validateProviderDispatchPermitV5R10,
  validateReferenceDispatchAuthorityV5R10,
} from "./dispatch-authority-v5-r10.mjs";

function requireCondition(condition, message) {
  if (!condition) throw new TypeError(message);
}

function estimateCost(inputTokens, outputTokens, priceSnapshot) {
  return Number((((inputTokens * priceSnapshot.inputUsdPerMillionTokens)
    + (outputTokens * priceSnapshot.outputUsdPerMillionTokens)) / 1_000_000).toFixed(12));
}

function authorityErrors(input) {
  return validateDispatchAuthorityV5R10(input);
}

export function createNativeProviderTransportV5R10({ fetchImplementation, credentialReader,
  repoRoot, protectedRoot, clock = () => new Date() } = {}) {
  const adapter = createNativeProviderAdapterV5R10({ fetchImplementation, credentialReader,
    repoRoot, protectedRoot, clock });
  return Object.freeze({
    kind: "V5_R10_NATIVE_EXACT_TRANSPORT",
    async send({ input, reservation, permit }) {
      return adapter.send({ ...input, reservation, dispatchPermit: permit });
    },
  });
}

function buildCompatibilityPermit(input, reservation) {
  const authorization = input.authorization.compatibilityAuthorization;
  const request = input.requestArtifact.compatibilityRequestArtifact;
  const receipt = sealV5R3Artifact({
    schemaVersion: "ProviderDispatchPermitV3", mode: "LIVE",
    runnerRegistrationHash: authorization.runnerRegistrationHash,
    freshRunnerReviewHash: authorization.freshRunnerReviewHash,
    authorizationHash: authorization.selfHash,
    sampleExecutionInventoryHash: input.inventory.selfHash,
    reservationHash: reservation.selfHash,
    requestArtifactHash: request.selfHash,
    attemptId: input.dispatchAuthority.attemptId,
    provider: input.authorization.provider, model: input.authorization.model,
    endpoint: input.authorization.endpoint, projectIdentityHash: input.authorization.projectIdentityHash,
    role: request.role, itemHash: request.itemHash, itemIdPseudonym: request.itemIdPseudonym,
    wireRequestBodyHash: request.wireRequestBodyHash,
    wireRequestByteLength: request.wireRequestByteLength, issuedAt: input.at,
  });
  assertClosedSelfHashedArtifactV5R10(receipt, "ProviderDispatchPermitV3");
  return receipt;
}

function buildEvent({ input, reservation, compatibilityPermit, transport, parsed, attemptStatus,
  parseStatus, schemaStatus, usageSource, inputTokens, outputTokens, reasoningTokens, totalTokens,
  estimatedCostUsd }) {
  const receipt = sealV5R3Artifact({
    schemaVersion: "ProviderEventReceiptV4", reservationHash: reservation.selfHash,
    authorizationHash: input.authorization.compatibilityAuthorizationHash,
    requestArtifactHash: input.requestArtifact.compatibilityRequestArtifactHash,
    dispatchPermitHash: compatibilityPermit.selfHash, dispatchPermit: structuredClone(compatibilityPermit),
    attemptId: input.dispatchAuthority.attemptId, role: input.requestArtifact.role,
    itemHash: input.requestArtifact.itemHash, itemIdPseudonym: input.requestArtifact.itemIdPseudonym,
    clusterId: input.requestArtifact.clusterId, provider: input.authorization.provider,
    requestedModel: input.authorization.model, observedModel: parsed?.observedModel ?? null,
    requestedEndpoint: input.authorization.endpoint, observedEndpoint: transport.observedEndpoint,
    projectIdentityHash: input.authorization.projectIdentityHash,
    requestBodyHash: transport.requestBodyHash, responseBodyHash: transport.responseBodyHash,
    providerRequestId: transport.providerRequestId, startedAt: transport.startedAt,
    finishedAt: transport.finishedAt, latencyMs: transport.latencyMs,
    transportStatus: transport.transportStatus, bodyReadStatus: transport.bodyReadStatus,
    httpStatus: transport.httpStatus, providerEventCount: transport.providerEventCount,
    httpRequestCount: transport.httpRequestCount, parseStatus, schemaStatus,
    finishReason: parsed?.finishReason ?? null, attemptStatus, usageSource,
    inputTokens, outputTokens, reasoningTokens, totalTokens,
    priceSnapshotHash: input.priceSnapshot.selfHash, estimatedCostUsd,
    reservedInputTokens: reservation.reservedInputTokens,
    reservedOutputTokens: reservation.reservedOutputTokens,
    reservedTokens: reservation.reservedTokens, reservedCostUsd: reservation.reservedUsd,
    providerInvoiceAuthoritative: true,
  });
  assertClosedSelfHashedArtifactV5R10(receipt, "ProviderEventReceiptV4");
  return receipt;
}

function buildRoleOutput(input, event, parsed) {
  const receipt = sealV5R3Artifact({
    schemaVersion: "ProviderRoleOutputV1", designId: "MAIS-NATURAL-CA60-V5",
    runnerRegistrationHash: input.registration.selfHash,
    sampleExecutionInventoryHash: input.inventory.selfHash,
    authorizationHash: input.authorization.compatibilityAuthorizationHash,
    provider: input.authorization.provider, model: input.authorization.model,
    endpoint: input.authorization.endpoint, role: input.requestArtifact.role,
    attemptId: input.dispatchAuthority.attemptId, attemptReceiptHash: event.selfHash,
    requestArtifactHash: input.requestArtifact.compatibilityRequestArtifactHash,
    itemHash: input.requestArtifact.itemHash, itemIdPseudonym: input.requestArtifact.itemIdPseudonym,
    clusterId: input.requestArtifact.clusterId, rolePromptHash: input.requestArtifact.rolePromptHash,
    roleSchemaHash: input.requestArtifact.roleSchemaHash,
    parsedPayload: structuredClone(parsed.parsedPayload), parsedPayloadHash: parsed.parsedPayloadHash,
    referenceInputCount: 0, deepSeekInputCount: 0,
  });
  assertClosedSelfHashedArtifactV5R10(receipt, "ProviderRoleOutputV1");
  return receipt;
}

export class NativeProviderAttemptFailureV5R10 extends Error {
  constructor(message, activity, cause) {
    super(message, { cause });
    this.name = "NativeProviderAttemptFailureV5R10";
    this.activity = activity;
  }
}

export async function runNativeProviderAttemptV5R10(input) {
  let activity = { providerEventCount: 0, httpRequestCount: 0, credentialReadCount: 0,
    naturalQuestionEgressCount: 0, activityStatus: "EXACT" };
  try {
    const errors = [
      ...validateProviderActivationV5R10(input),
      ...authorityErrors(input),
      ...validateAndRebuildProviderRequestArtifactV5R6(input),
    ];
    requireCondition(errors.length === 0, errors.join("; "));
    for (const name of ["dispatchAuthorityStore", "dispatchPermitStore",
      "compatibilityDispatchPermitStore", "preparedCompletionStore",
      "attemptCommitIntentStore", "resolvedAttemptReceiptStore"]) {
      requireCondition(typeof input?.[name]?.append === "function", `R10 ${name} is unavailable`);
    }
    requireCondition(typeof input?.ledger?.reserve === "function"
      && typeof input.ledger.completeWithDurableIntent === "function"
      && typeof input?.rawResponseStore?.persist === "function"
      && typeof input.rawResponseStore.persistBinding === "function"
      && input?.transport?.kind === "V5_R10_NATIVE_EXACT_TRANSPORT",
    "R10 ledger/raw/native-transport dependencies are unavailable");
    const authorityPersisted = await input.dispatchAuthorityStore.append(input.dispatchAuthority);
    requireCondition(authorityPersisted?.contentHash === input.dispatchAuthority.selfHash,
      "R10 dispatch authority was not durable before reservation");
    const reservation = await input.ledger.reserve({
      requestArtifact: input.requestArtifact.compatibilityRequestArtifact,
    });
    const permit = buildProviderDispatchPermitV5R10({ input, reservation });
    const permitPersisted = await input.dispatchPermitStore.append(permit);
    requireCondition(permitPersisted?.contentHash === permit.selfHash,
      "R10 dispatch permit was not durable before credential read");
    const transportResult = await input.transport.send({ input, reservation, permit });
    activity = { providerEventCount: transportResult.providerEventCount,
      httpRequestCount: transportResult.httpRequestCount,
      credentialReadCount: transportResult.credentialReadCount,
      naturalQuestionEgressCount: transportResult.naturalQuestionEgressCount,
      activityStatus: "EXACT" };
    const rawPersisted = await input.rawResponseStore.persist({
      activeRunnerRegistrationHash: input.activeRegistration.selfHash,
      authorizationHash: input.authorization.selfHash,
      requestArtifactHash: input.requestArtifact.selfHash,
      reservationHash: reservation.selfHash,
      dispatchAuditHash: input.dispatchAuthority.selfHash,
      attemptId: input.dispatchAuthority.attemptId,
      provider: input.authorization.provider, role: input.requestArtifact.role,
      itemHash: input.requestArtifact.itemHash, transportStatus: transportResult.transportStatus,
      bodyReadStatus: transportResult.bodyReadStatus, httpStatus: transportResult.httpStatus,
      rawResponseBody: transportResult.rawResponseBody, capturedAt: transportResult.finishedAt,
    });
    let parsed = null;
    let parseStatus = "NOT_PARSED";
    let schemaStatus = "NOT_EVALUATED";
    let attemptStatus = transportResult.transportStatus === "DELIVERED" ? "SCHEMA_FAILURE"
      : transportResult.transportStatus === "NOT_DISPATCHED" ? "CREDENTIAL_UNAVAILABLE"
        : transportResult.transportStatus;
    if (transportResult.transportStatus === "DELIVERED") {
      try {
        parsed = independentlyReparseRawResponseV5R6({
          rawResponseArtifact: rawPersisted.artifact,
          requestArtifact: input.requestArtifact,
        });
        parseStatus = "PARSED";
        schemaStatus = "VALID";
        attemptStatus = parsed.observedModel === input.authorization.model
          && transportResult.observedEndpoint === input.authorization.endpoint
          && ["completed", "stop"].includes(parsed.finishReason)
          ? "SUCCEEDED" : "PROVIDER_TUPLE_DRIFT";
      } catch {
        parseStatus = "MALFORMED_OR_NONCONFORMING";
        schemaStatus = "INVALID";
        attemptStatus = "SCHEMA_FAILURE";
      }
    }
    const usageSource = parsed?.usage ? "PROVIDER_ENVELOPE" : "UNAVAILABLE_RESERVED_WORST_CASE";
    const inputTokens = usageSource === "PROVIDER_ENVELOPE" ? parsed.usage.inputTokens : null;
    const outputTokens = usageSource === "PROVIDER_ENVELOPE" ? parsed.usage.outputTokens : null;
    const reasoningTokens = usageSource === "PROVIDER_ENVELOPE" ? parsed.usage.reasoningTokens : null;
    const totalTokens = usageSource === "PROVIDER_ENVELOPE" ? parsed.usage.totalTokens : null;
    if (usageSource === "PROVIDER_ENVELOPE" && (inputTokens > reservation.reservedInputTokens
      || outputTokens > reservation.reservedOutputTokens || totalTokens > reservation.reservedTokens)) {
      attemptStatus = "CAP_INTEGRITY_FAILED";
    }
    const estimatedCostUsd = transportResult.providerEventCount === 0 ? 0
      : usageSource === "PROVIDER_ENVELOPE"
        ? estimateCost(inputTokens, outputTokens, input.priceSnapshot) : reservation.reservedUsd;
    const compatibilityPermit = buildCompatibilityPermit(input, reservation);
    const compatibilityPermitPersisted = await input.compatibilityDispatchPermitStore.append(compatibilityPermit);
    requireCondition(compatibilityPermitPersisted?.contentHash === compatibilityPermit.selfHash,
      "R10 compatibility permit was not durable before attempt intent");
    const providerEventReceipt = buildEvent({ input, reservation, compatibilityPermit,
      transport: transportResult, parsed, attemptStatus, parseStatus, schemaStatus, usageSource,
      inputTokens, outputTokens, reasoningTokens, totalTokens, estimatedCostUsd });
    const roleOutput = attemptStatus === "SUCCEEDED" ? buildRoleOutput(input, providerEventReceipt, parsed) : null;
    const binding = buildRawResponseBindingReceiptV5R6({
      activeRunnerRegistrationHash: input.activeRegistration.selfHash,
      rawResponseArtifact: rawPersisted.artifact, providerEventReceipt, roleOutput,
      requestArtifact: input.requestArtifact, boundAt: transportResult.finishedAt,
    });
    const bindingPersisted = await input.rawResponseStore.persistBinding(binding);
    requireCondition(bindingPersisted?.persistedBeforeCompletion === true,
      "R10 raw binding was not durable before attempt intent");
    const committed = await commitProviderAttemptWithDurableIntentV5R10({
      activeRunnerRegistrationHash: input.activeRegistration.selfHash,
      authorizationHash: input.authorization.selfHash,
      authenticatedRouteEvidenceHash: input.routeEvidenceEnvelope.selfHash,
      requestArtifact: input.requestArtifact, dispatchAudit: input.dispatchAuthority,
      reservation, dispatchPermit: permit, compatibilityDispatchPermit: compatibilityPermit,
      rawResponseArtifact: rawPersisted.artifact, rawResponseBindingReceipt: binding,
      providerEventReceipt, roleOutput, rawAndBindingDurable: true,
      projectResidency: input.authorization.projectResidency, dataRegion: input.authorization.dataRegion,
      credentialReadCount: transportResult.credentialReadCount,
      preparedAt: transportResult.finishedAt, ledger: input.ledger,
      preparedCompletionStore: input.preparedCompletionStore,
      attemptCommitIntentStore: input.attemptCommitIntentStore,
      resolvedAttemptReceiptStore: input.resolvedAttemptReceiptStore,
    });
    return Object.freeze({ status: attemptStatus, dispatchAllowed: true, ...activity,
      dispatchAuthority: input.dispatchAuthority, reservation, permit, compatibilityPermit,
      rawResponseArtifact: rawPersisted.artifact, rawResponseBindingReceipt: binding,
      providerEventReceipt, roleOutput, completion: committed.committedCompletion,
      attemptCommitIntent: committed.intent, resolvedAttemptReceipt: committed.resolvedAttemptReceipt });
  } catch (error) {
    throw new NativeProviderAttemptFailureV5R10(
      error instanceof Error ? error.message : String(error),
      activity,
      error,
    );
  }
}

export const NATIVE_PROVIDER_ATTEMPT_V5_R10_CONSTANTS = Object.freeze({
  requestTimeoutMs: NATIVE_PROVIDER_ADAPTER_V5_R10_CONSTANTS.requestTimeoutMs,
  maximumResponseBytes: NATIVE_PROVIDER_ADAPTER_V5_R10_CONSTANTS.maximumResponseBytes,
  credentialReadBoundary:
    "ONLY_AFTER_EXACT_R9_GIT_REGISTRATION_A07_CLOSEOUT_SIGNED_A11_REVIEW_RAW_ROUTE_COST_AUTHORITY_REQUEST_RESERVATION_AND_PERMIT",
  compatibilityTransportIsDispatchAuthority: false,
  defaultNativePlannerExecutorInstalled: true,
});
