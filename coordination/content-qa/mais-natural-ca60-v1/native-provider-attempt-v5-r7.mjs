import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  validateProviderActivationV5R7,
} from "./activation-guard-v5-r7.mjs";
import {
  exactProviderWireBytesV5R6,
  validateAndRebuildProviderRequestArtifactV5R6,
} from "./provider-request-v5-r6.mjs";
import {
  buildRawResponseBindingReceiptV5R6,
  independentlyReparseRawResponseV5R6,
} from "./raw-response-custody-v5-r6.mjs";
import {
  commitProviderAttemptWithDurableIntentV5R7,
} from "./attempt-transaction-v5-r7.mjs";
import {
  buildProviderDispatchPermitV5R7,
  buildReferenceDispatchAuthorityV5R7,
  validateDispatchAuthorityV5R7,
  validateProviderDispatchPermitV5R7,
  validateReferenceDispatchAuthorityV5R7,
} from "./dispatch-authority-v5-r7.mjs";
import {
  assertClosedSelfHashedArtifactV5R7,
} from "./schema-contract-v5-r7.mjs";

export {
  buildProviderDispatchPermitV5R7,
  buildReferenceDispatchAuthorityV5R7,
  validateProviderDispatchPermitV5R7,
  validateReferenceDispatchAuthorityV5R7,
} from "./dispatch-authority-v5-r7.mjs";

const RESPONSE_HEADER_ALLOWLIST = Object.freeze(["content-type", "date", "openai-processing-ms", "x-request-id"]);
const REQUEST_ID_HEADERS = Object.freeze(["x-request-id", "request-id", "cf-ray"]);
const PROVIDER_REQUEST_TIMEOUT_MS = 120_000;
const MAX_PROVIDER_RESPONSE_BYTES = 16 * 1024 * 1024;

function requireCondition(condition, message) {
  if (!condition) throw new TypeError(message);
}

function nowIso(clock) {
  const value = clock();
  const date = value instanceof Date ? value : new Date(value);
  requireCondition(Number.isFinite(date.getTime()), "R7 transport clock is invalid");
  return date.toISOString();
}

function redactedHeaders(headers) {
  const result = {};
  for (const name of RESPONSE_HEADER_ALLOWLIST) {
    const value = headers?.get?.(name);
    if (typeof value === "string" && value.length > 0) result[name] = value;
  }
  return result;
}

function providerRequestId(headers) {
  for (const name of REQUEST_ID_HEADERS) {
    const value = headers?.get?.(name);
    if (typeof value === "string" && value.length > 0) return value;
  }
  return null;
}

function estimateCost(inputTokens, outputTokens, priceSnapshot) {
  return Number((((inputTokens * priceSnapshot.inputUsdPerMillionTokens)
    + (outputTokens * priceSnapshot.outputUsdPerMillionTokens)) / 1_000_000).toFixed(12));
}

function validatedCredentialBundle(raw, authorization) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const expectedKeys = authorization.provider === "OPENAI_DIRECT"
    ? ["apiKey", "openAIProjectId", "subjectIdentity"].sort()
    : ["apiKey", "subjectIdentity"].sort();
  if (canonicalJsonV5R3(Object.keys(raw).sort()) !== canonicalJsonV5R3(expectedKeys)
    || typeof raw.apiKey !== "string" || raw.apiKey.length < 1
    || typeof raw.subjectIdentity !== "string" || raw.subjectIdentity.length < 1
    || sha256V5R3(raw.subjectIdentity) !== authorization.projectIdentityHash) return null;
  if (authorization.provider === "OPENAI_DIRECT" && raw.openAIProjectId !== raw.subjectIdentity) return null;
  return raw;
}

function authorityErrors(input) {
  return validateDispatchAuthorityV5R7(input);
}

export function createNativeProviderTransportV5R7({ fetchImplementation, credentialReader,
  clock = () => new Date() } = {}) {
  requireCondition(typeof fetchImplementation === "function" && typeof credentialReader === "function",
    "R7 native transport requires injected fetch and credential-reader functions");
  return Object.freeze({
    kind: "V5_R7_NATIVE_EXACT_TRANSPORT",
    async send({ input, reservation, permit }) {
      const errors = [
        ...validateProviderActivationV5R7(input),
        ...authorityErrors(input),
        ...validateAndRebuildProviderRequestArtifactV5R6(input),
        ...validateProviderDispatchPermitV5R7({ permit, input, reservation }),
      ];
      requireCondition(errors.length === 0,
        `R7 native transport rejected before credential read: ${errors.join("; ")}`);
      const wireBytes = exactProviderWireBytesV5R6(input.requestArtifact);
      requireCondition(sha256V5R3(wireBytes) === permit.wireRequestBodyHash
        && wireBytes.byteLength === permit.wireRequestByteLength,
      "R7 native transport bytes differ from the exact permit");
      const startedAt = nowIso(clock);
      let credentialBundle = null;
      try {
        credentialBundle = validatedCredentialBundle(await credentialReader({
          provider: input.authorization.provider,
          endpoint: input.authorization.endpoint,
          projectResidency: input.authorization.projectResidency,
          dataRegion: input.authorization.dataRegion,
          expectedSubjectIdentityHash: input.authorization.projectIdentityHash,
          activeRunnerRegistrationHash: input.activeRegistration.selfHash,
          dispatchAuthorityHash: input.dispatchAuthority.selfHash,
        }), input.authorization);
      } catch {
        credentialBundle = null;
      }
      if (!credentialBundle) {
        const finishedAt = nowIso(clock);
        return Object.freeze({ startedAt, finishedAt,
          latencyMs: Date.parse(finishedAt) - Date.parse(startedAt), transportStatus: "NOT_DISPATCHED",
          bodyReadStatus: "NOT_AVAILABLE", httpStatus: null, observedEndpoint: null,
          requestBodyHash: sha256V5R3(wireBytes), responseBodyHash: null, providerRequestId: null,
          responseHeaders: {}, rawResponseBody: null, providerEventCount: 0, httpRequestCount: 0,
          credentialReadCount: 1, transportError: "CREDENTIAL_OR_PROJECT_IDENTITY_UNAVAILABLE" });
      }
      let rawResponseBody = null;
      let responseBodyHash = null;
      let transportStatus = "CONNECTION_LOST_AFTER_DISPATCH";
      let bodyReadStatus = "NOT_AVAILABLE";
      let httpStatus = null;
      let observedEndpoint = null;
      let requestId = null;
      let responseHeaders = {};
      let transportError = null;
      try {
        const headers = { authorization: `Bearer ${credentialBundle.apiKey}`,
          "content-type": "application/json" };
        if (input.authorization.provider === "OPENAI_DIRECT") {
          headers["openai-project"] = credentialBundle.openAIProjectId;
        }
        const response = await fetchImplementation(input.authorization.endpoint, {
          method: "POST", redirect: "error", signal: AbortSignal.timeout(PROVIDER_REQUEST_TIMEOUT_MS),
          headers, body: wireBytes.toString("utf8"),
        });
        httpStatus = response.status;
        observedEndpoint = typeof response.url === "string" && response.url.length > 0
          ? response.url : input.authorization.endpoint;
        requestId = providerRequestId(response.headers);
        responseHeaders = redactedHeaders(response.headers);
        const bytes = Buffer.from(await response.arrayBuffer());
        if (bytes.byteLength > MAX_PROVIDER_RESPONSE_BYTES) throw new RangeError("R7 response exceeds byte cap");
        rawResponseBody = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        responseBodyHash = sha256V5R3(Buffer.from(rawResponseBody, "utf8"));
        bodyReadStatus = "COMPLETE";
        transportStatus = response.ok ? "DELIVERED" : "HTTP_FAILURE";
      } catch (error) {
        transportError = error instanceof Error ? error.name : "TRANSPORT_ERROR";
      }
      const finishedAt = nowIso(clock);
      return Object.freeze({ startedAt, finishedAt,
        latencyMs: Date.parse(finishedAt) - Date.parse(startedAt), transportStatus, bodyReadStatus,
        httpStatus, observedEndpoint, requestBodyHash: sha256V5R3(wireBytes), responseBodyHash,
        providerRequestId: requestId, responseHeaders, rawResponseBody, providerEventCount: 1,
        httpRequestCount: 1, credentialReadCount: 1, transportError });
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
  assertClosedSelfHashedArtifactV5R7(receipt, "ProviderDispatchPermitV3");
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
  assertClosedSelfHashedArtifactV5R7(receipt, "ProviderEventReceiptV4");
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
  assertClosedSelfHashedArtifactV5R7(receipt, "ProviderRoleOutputV1");
  return receipt;
}

export class NativeProviderAttemptFailureV5R7 extends Error {
  constructor(message, activity, cause) {
    super(message, { cause });
    this.name = "NativeProviderAttemptFailureV5R7";
    this.activity = activity;
  }
}

export async function runNativeProviderAttemptV5R7(input) {
  let activity = { providerEventCount: 0, httpRequestCount: 0, credentialReadCount: 0,
    naturalQuestionEgressCount: 0, activityStatus: "EXACT" };
  try {
    const errors = [
      ...validateProviderActivationV5R7(input),
      ...authorityErrors(input),
      ...validateAndRebuildProviderRequestArtifactV5R6(input),
    ];
    requireCondition(errors.length === 0, errors.join("; "));
    for (const name of ["dispatchAuthorityStore", "dispatchPermitStore",
      "compatibilityDispatchPermitStore", "attemptCommitIntentStore", "resolvedAttemptReceiptStore"]) {
      requireCondition(typeof input?.[name]?.append === "function", `R7 ${name} is unavailable`);
    }
    requireCondition(typeof input?.ledger?.reserve === "function"
      && typeof input.ledger.completeWithDurableIntent === "function"
      && typeof input?.rawResponseStore?.persist === "function"
      && typeof input.rawResponseStore.persistBinding === "function"
      && input?.transport?.kind === "V5_R7_NATIVE_EXACT_TRANSPORT",
    "R7 ledger/raw/native-transport dependencies are unavailable");
    const authorityPersisted = await input.dispatchAuthorityStore.append(input.dispatchAuthority);
    requireCondition(authorityPersisted?.contentHash === input.dispatchAuthority.selfHash,
      "R7 dispatch authority was not durable before reservation");
    const reservation = await input.ledger.reserve({
      requestArtifact: input.requestArtifact.compatibilityRequestArtifact,
    });
    const permit = buildProviderDispatchPermitV5R7({ input, reservation });
    const permitPersisted = await input.dispatchPermitStore.append(permit);
    requireCondition(permitPersisted?.contentHash === permit.selfHash,
      "R7 dispatch permit was not durable before credential read");
    const transportResult = await input.transport.send({ input, reservation, permit });
    activity = { providerEventCount: transportResult.providerEventCount,
      httpRequestCount: transportResult.httpRequestCount,
      credentialReadCount: transportResult.credentialReadCount,
      naturalQuestionEgressCount: transportResult.providerEventCount,
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
      "R7 compatibility permit was not durable before attempt intent");
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
      "R7 raw binding was not durable before attempt intent");
    const committed = await commitProviderAttemptWithDurableIntentV5R7({
      activeRunnerRegistrationHash: input.activeRegistration.selfHash,
      authorizationHash: input.authorization.selfHash,
      authenticatedRouteEvidenceHash: input.authenticatedRouteEvidence.selfHash,
      requestArtifact: input.requestArtifact, dispatchAudit: input.dispatchAuthority,
      reservation, dispatchPermit: permit, compatibilityDispatchPermit: compatibilityPermit,
      rawResponseArtifact: rawPersisted.artifact, rawResponseBindingReceipt: binding,
      providerEventReceipt, roleOutput, rawAndBindingDurable: true,
      projectResidency: input.authorization.projectResidency, dataRegion: input.authorization.dataRegion,
      credentialReadCount: transportResult.credentialReadCount,
      preparedAt: transportResult.finishedAt, ledger: input.ledger,
      attemptCommitIntentStore: input.attemptCommitIntentStore,
      resolvedAttemptReceiptStore: input.resolvedAttemptReceiptStore,
    });
    return Object.freeze({ status: attemptStatus, dispatchAllowed: true, ...activity,
      dispatchAuthority: input.dispatchAuthority, reservation, permit, compatibilityPermit,
      rawResponseArtifact: rawPersisted.artifact, rawResponseBindingReceipt: binding,
      providerEventReceipt, roleOutput, completion: committed.committedCompletion,
      attemptCommitIntent: committed.intent, resolvedAttemptReceipt: committed.resolvedAttemptReceipt });
  } catch (error) {
    throw new NativeProviderAttemptFailureV5R7(
      error instanceof Error ? error.message : String(error),
      activity,
      error,
    );
  }
}

export const NATIVE_PROVIDER_ATTEMPT_V5_R7_CONSTANTS = Object.freeze({
  requestTimeoutMs: PROVIDER_REQUEST_TIMEOUT_MS,
  maximumResponseBytes: MAX_PROVIDER_RESPONSE_BYTES,
  credentialReadBoundary: "ONLY_AFTER_R7_REGISTRATION_REVIEW_RAW_DERIVED_ROUTE_BUFFERED_COST_AUTHORITY_REQUEST_RESERVATION_AND_PERMIT",
  compatibilityTransportIsDispatchAuthority: false,
  defaultLiveBindingsInstalled: false,
});
