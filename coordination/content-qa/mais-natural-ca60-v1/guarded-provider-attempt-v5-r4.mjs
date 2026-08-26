import DESIGN from "../../research/mais-natural-ca60-v1/versions/design-v5/design-registration.json" with { type: "json" };
import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  assertClosedSelfHashedArtifactV5R4,
  validateClosedSelfHashedArtifactV5R4,
} from "./schema-contract-v5-r4.mjs";
import { validateProviderAuthorizationV5R4 } from "./route-authorization-v5-r4.mjs";
import {
  exactProviderWireBytesV5R4,
  validateAndRebuildProviderRequestArtifactV5R4,
} from "./provider-request-v5-r4.mjs";
import { parseOpenAIReferenceLiveResponseV5R2 } from "./openai-reference-adapter-v5.mjs";
import { parseDeepSeekEvaluationResponseV5R2 } from "./deepseek-evaluation-adapter-v5-r2.mjs";

const RESPONSE_HEADER_ALLOWLIST = Object.freeze(["content-type", "date", "openai-processing-ms", "x-request-id"]);
const REQUEST_ID_HEADERS = Object.freeze(["x-request-id", "request-id", "cf-ray"]);
const PROVIDER_REQUEST_TIMEOUT_MS = 120_000;
const MAX_PROVIDER_RESPONSE_BYTES = 16 * 1024 * 1024;

function nowIso(clock) {
  const value = clock();
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new TypeError("transport clock returned an invalid timestamp");
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
  if (![inputTokens, outputTokens].every((value) => Number.isSafeInteger(value) && value >= 0)) throw new TypeError("provider usage is invalid");
  return Number((((inputTokens * priceSnapshot.inputUsdPerMillionTokens)
    + (outputTokens * priceSnapshot.outputUsdPerMillionTokens)) / 1_000_000).toFixed(12));
}

export function providerSubjectIdentityHashV5R4(subjectIdentity) {
  if (typeof subjectIdentity !== "string" || subjectIdentity.length < 1) throw new TypeError("provider subject identity is unavailable");
  return sha256V5R3(subjectIdentity);
}

function validatedCredentialBundle(raw, authorization) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const keys = Object.keys(raw).sort();
  const expectedKeys = authorization.provider === "OPENAI_DIRECT"
    ? ["apiKey", "openAIProjectId", "subjectIdentity"].sort()
    : ["apiKey", "subjectIdentity"].sort();
  if (canonicalJsonV5R3(keys) !== canonicalJsonV5R3(expectedKeys)
    || typeof raw.apiKey !== "string" || raw.apiKey.length < 1
    || typeof raw.subjectIdentity !== "string" || raw.subjectIdentity.length < 1
    || providerSubjectIdentityHashV5R4(raw.subjectIdentity) !== authorization.projectIdentityHash) return null;
  if (authorization.provider === "OPENAI_DIRECT"
    && (typeof raw.openAIProjectId !== "string" || raw.openAIProjectId !== raw.subjectIdentity)) return null;
  return raw;
}

export function buildDispatchPermitV5R4({ registration, review, authorization, inventory, reservation, requestArtifact, issuedAt }) {
  assertClosedSelfHashedArtifactV5R4(registration, "NaturalCaExecutionRunnerRegistrationV3");
  assertClosedSelfHashedArtifactV5R4(review, "IndependentExecutionRunnerReviewReceiptV2");
  assertClosedSelfHashedArtifactV5R4(authorization, "ProviderAuthorizationV4");
  assertClosedSelfHashedArtifactV5R4(inventory, "SampleExecutionInventoryV2");
  assertClosedSelfHashedArtifactV5R4(reservation, "ProviderDispatchReservationV2");
  assertClosedSelfHashedArtifactV5R4(requestArtifact, "ProviderRequestArtifactV4");
  if (review.selfHash !== authorization.freshRunnerReviewHash || registration.selfHash !== authorization.runnerRegistrationHash
    || inventory.selfHash !== authorization.sampleExecutionInventoryHash || reservation.authorizationHash !== authorization.selfHash
    || reservation.requestArtifactHash !== requestArtifact.selfHash || requestArtifact.authorizationHash !== authorization.selfHash
    || requestArtifact.sampleExecutionInventoryHash !== inventory.selfHash || reservation.attemptId !== requestArtifact.attemptId
    || reservation.itemHash !== requestArtifact.itemHash || reservation.role !== requestArtifact.role) {
    throw new TypeError("dispatch permit upstream lineage is invalid");
  }
  const permit = sealV5R3Artifact({
    schemaVersion: "ProviderDispatchPermitV3",
    mode: "LIVE",
    runnerRegistrationHash: registration.selfHash,
    freshRunnerReviewHash: review.selfHash,
    authorizationHash: authorization.selfHash,
    sampleExecutionInventoryHash: inventory.selfHash,
    reservationHash: reservation.selfHash,
    requestArtifactHash: requestArtifact.selfHash,
    attemptId: requestArtifact.attemptId,
    provider: requestArtifact.provider,
    model: requestArtifact.model,
    endpoint: requestArtifact.endpoint,
    projectIdentityHash: authorization.projectIdentityHash,
    role: requestArtifact.role,
    itemHash: requestArtifact.itemHash,
    itemIdPseudonym: requestArtifact.itemIdPseudonym,
    wireRequestBodyHash: requestArtifact.wireRequestBodyHash,
    wireRequestByteLength: requestArtifact.wireRequestByteLength,
    issuedAt,
  });
  assertClosedSelfHashedArtifactV5R4(permit, "ProviderDispatchPermitV3");
  return permit;
}

export function validateDispatchPermitV5R4({ permit, registration, review, authorization, inventory, reservation, requestArtifact }) {
  const errors = [...validateClosedSelfHashedArtifactV5R4(permit, "ProviderDispatchPermitV3")];
  try {
    const rebuilt = buildDispatchPermitV5R4({ registration, review, authorization, inventory, reservation, requestArtifact, issuedAt: permit?.issuedAt });
    if (canonicalJsonV5R3(rebuilt) !== canonicalJsonV5R3(permit)) errors.push("dispatch permit differs from exact reconstruction");
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return Object.freeze([...new Set(errors)]);
}

export function createExactProviderTransportV5R4({ fetchImplementation, credentialReader, clock = () => new Date() } = {}) {
  if (typeof fetchImplementation !== "function" || typeof credentialReader !== "function") throw new TypeError("transport requires injected fetch and credential-reader functions");
  return Object.freeze({
    async send(input) {
      const permitErrors = validateDispatchPermitV5R4(input);
      if (permitErrors.length > 0) throw new Error(`transport permit rejected before credential read: ${permitErrors.join("; ")}`);
      const requestErrors = validateAndRebuildProviderRequestArtifactV5R4(input);
      if (requestErrors.length > 0) throw new Error(`transport request reconstruction failed before credential read: ${requestErrors.join("; ")}`);
      const wireBytes = exactProviderWireBytesV5R4(input.requestArtifact);
      if (sha256V5R3(wireBytes) !== input.permit.wireRequestBodyHash || wireBytes.byteLength !== input.permit.wireRequestByteLength) {
        throw new Error("transport exact bytes differ from the immutable dispatch permit");
      }
      const startedAt = nowIso(clock);
      let credentialBundle;
      try {
        credentialBundle = validatedCredentialBundle(await credentialReader({
          provider: input.authorization.provider,
          endpoint: input.authorization.endpoint,
          expectedSubjectIdentityHash: input.authorization.projectIdentityHash,
        }), input.authorization);
      } catch {
        credentialBundle = null;
      }
      if (!credentialBundle) {
        const finishedAt = nowIso(clock);
        return Object.freeze({
          startedAt, finishedAt, latencyMs: Date.parse(finishedAt) - Date.parse(startedAt),
          transportStatus: "NOT_DISPATCHED", bodyReadStatus: "NOT_AVAILABLE", httpStatus: null,
          observedEndpoint: null, requestBodyHash: sha256V5R3(wireBytes), responseBodyHash: null,
          providerRequestId: null, responseHeaders: {}, rawResponseBody: null, providerEventCount: 0,
          httpRequestCount: 0, transportError: "CREDENTIAL_OR_PROJECT_IDENTITY_UNAVAILABLE", credentialReadCount: 1,
        });
      }
      let response;
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
        const requestHeaders = {
          authorization: `Bearer ${credentialBundle.apiKey}`,
          "content-type": "application/json",
        };
        if (input.authorization.provider === "OPENAI_DIRECT") requestHeaders["openai-project"] = credentialBundle.openAIProjectId;
        response = await fetchImplementation(input.authorization.endpoint, {
          method: "POST",
          redirect: "error",
          signal: AbortSignal.timeout(PROVIDER_REQUEST_TIMEOUT_MS),
          headers: requestHeaders,
          body: wireBytes.toString("utf8"),
        });
        httpStatus = response.status;
        observedEndpoint = typeof response.url === "string" && response.url.length > 0 ? response.url : input.authorization.endpoint;
        requestId = providerRequestId(response.headers);
        responseHeaders = redactedHeaders(response.headers);
        const responseBytes = Buffer.from(await response.arrayBuffer());
        if (responseBytes.byteLength > MAX_PROVIDER_RESPONSE_BYTES) throw new RangeError("provider response exceeds the frozen byte limit");
        rawResponseBody = new TextDecoder("utf-8", { fatal: true }).decode(responseBytes);
        responseBodyHash = sha256V5R3(Buffer.from(rawResponseBody, "utf8"));
        bodyReadStatus = "COMPLETE";
        transportStatus = response.ok ? "DELIVERED" : "HTTP_FAILURE";
      } catch (error) {
        transportError = error instanceof Error ? error.name : "TRANSPORT_ERROR";
      }
      const finishedAt = nowIso(clock);
      return Object.freeze({
        startedAt,
        finishedAt,
        latencyMs: Date.parse(finishedAt) - Date.parse(startedAt),
        transportStatus,
        bodyReadStatus,
        httpStatus,
        observedEndpoint,
        requestBodyHash: sha256V5R3(wireBytes),
        responseBodyHash,
        providerRequestId: requestId,
        responseHeaders,
        rawResponseBody,
        providerEventCount: 1,
        httpRequestCount: 1,
        transportError,
        credentialReadCount: 1,
      });
    },
  });
}

export const GUARDED_PROVIDER_ATTEMPT_V5_R4_CONSTANTS = Object.freeze({
  requestTimeoutMs: PROVIDER_REQUEST_TIMEOUT_MS,
  maximumResponseBytes: MAX_PROVIDER_RESPONSE_BYTES,
});

function parseDelivered({ authorization, requestArtifact, transportResult }) {
  const responseEnvelope = JSON.parse(transportResult.rawResponseBody);
  if (authorization.provider === "OPENAI_DIRECT") {
    const parsed = parseOpenAIReferenceLiveResponseV5R2({
      role: requestArtifact.role,
      logicalRequest: requestArtifact.logicalRequest,
      wireRequest: requestArtifact.wireRequest,
      rawResponseBody: transportResult.rawResponseBody,
      responseEnvelope,
      responseHeaders: transportResult.responseHeaders,
    });
    return Object.freeze({
      parsedPayload: parsed.structuredPayload,
      parsedPayloadHash: parsed.structuredPayloadHash,
      observedModel: parsed.observedModel,
      responseId: parsed.responseId,
      finishReason: "completed",
      usage: parsed.usage,
    });
  }
  const parsed = parseDeepSeekEvaluationResponseV5R2({ request: {
    schemaVersion: "DeepSeekEvaluationRequestV5R2",
    designId: "MAIS-NATURAL-CA60-V5",
    registrationHash: DESIGN.registrationHash,
    provider: requestArtifact.provider,
    endpoint: requestArtifact.endpoint,
    model: requestArtifact.model,
    role: requestArtifact.role,
    logicalRequest: requestArtifact.logicalRequest,
    logicalRequestHash: requestArtifact.logicalRequestHash,
    wireRequestBody: requestArtifact.wireRequest,
    wireRequestBodyBytes: requestArtifact.wireRequestByteLength,
    wireRequestBodyHash: requestArtifact.wireRequestBodyHash,
    adapterTransformVersion: "DEEPSEEK_DIRECT_OPENAI_COMPAT_V5_R2_1",
    adapterTransformHash: requestArtifact.adapterTransformHash,
    referenceInputCount: 0,
  }, rawResponseBody: transportResult.rawResponseBody });
  return Object.freeze({
    parsedPayload: parsed.structuredPayload,
    parsedPayloadHash: parsed.structuredPayloadHash,
    observedModel: parsed.observedModel,
    responseId: parsed.responseId,
    finishReason: parsed.finishReason,
    usage: parsed.usage,
  });
}

function blocked(errors) {
  return Object.freeze({
    schemaVersion: "GuardedProviderAttemptRunV5R4",
    status: "AUTHORIZATION_BLOCKED",
    dispatchAllowed: false,
    credentialReadCount: 0,
    providerEventCount: 0,
    httpRequestCount: 0,
    reservation: null,
    permit: null,
    providerEventReceipt: null,
    roleOutput: null,
    completion: null,
    errors: Object.freeze(errors),
  });
}

export async function runGuardedProviderAttemptV5R4(input) {
  const authorizationErrors = validateProviderAuthorizationV5R4(input);
  const requestErrors = validateAndRebuildProviderRequestArtifactV5R4(input);
  const preflightErrors = [...authorizationErrors, ...requestErrors];
  if (typeof input?.ledger?.reserve !== "function" || typeof input?.ledger?.complete !== "function") preflightErrors.push("authoritative atomic ledger is unavailable");
  if (typeof input?.transport?.send !== "function") preflightErrors.push("exact provider transport is unavailable");
  if (preflightErrors.length > 0) return blocked([...new Set(preflightErrors)]);
  const reservation = await input.ledger.reserve({ requestArtifact: input.requestArtifact });
  const permit = buildDispatchPermitV5R4({
    registration: input.registration,
    review: input.review,
    authorization: input.authorization,
    inventory: input.inventory,
    reservation,
    requestArtifact: input.requestArtifact,
    issuedAt: input.at,
  });
  let transportResult;
  try {
    transportResult = await input.transport.send({ ...input, reservation, permit });
  } catch (error) {
    const failedAt = typeof input.failureClock === "function" ? input.failureClock() : input.at;
    transportResult = Object.freeze({
      startedAt: input.at,
      finishedAt: failedAt,
      latencyMs: Math.max(0, Date.parse(failedAt) - Date.parse(input.at)),
      transportStatus: "NOT_DISPATCHED",
      bodyReadStatus: "NOT_AVAILABLE",
      httpStatus: null,
      observedEndpoint: null,
      requestBodyHash: input.requestArtifact.wireRequestBodyHash,
      responseBodyHash: null,
      providerRequestId: null,
      responseHeaders: {},
      rawResponseBody: null,
      providerEventCount: 0,
      httpRequestCount: 0,
      transportError: error instanceof Error ? error.name : "TRANSPORT_ERROR",
      credentialReadCount: 0,
    });
  }
  let parsed = null;
  let attemptStatus = transportResult.transportStatus === "DELIVERED" ? "SCHEMA_FAILURE"
    : transportResult.transportStatus === "NOT_DISPATCHED" ? "CREDENTIAL_UNAVAILABLE" : transportResult.transportStatus;
  let parseStatus = "NOT_PARSED";
  let schemaStatus = "NOT_EVALUATED";
  if (transportResult.transportStatus === "DELIVERED") {
    try {
      parsed = parseDelivered({ authorization: input.authorization, requestArtifact: input.requestArtifact, transportResult });
      parseStatus = "PARSED";
      schemaStatus = "VALID";
      attemptStatus = parsed.observedModel === input.authorization.model
        && ["completed", "stop"].includes(parsed.finishReason) ? "SUCCEEDED" : "PROVIDER_TUPLE_DRIFT";
    } catch {
      parseStatus = "MALFORMED_OR_NONCONFORMING";
      schemaStatus = "INVALID";
      attemptStatus = "SCHEMA_FAILURE";
    }
  }
  const usageSource = parsed?.usage ? "PROVIDER_ENVELOPE" : "UNAVAILABLE_RESERVED_WORST_CASE";
  let inputTokens = usageSource === "PROVIDER_ENVELOPE" ? parsed.usage.inputTokens : null;
  let outputTokens = usageSource === "PROVIDER_ENVELOPE" ? parsed.usage.outputTokens : null;
  let reasoningTokens = usageSource === "PROVIDER_ENVELOPE" ? parsed.usage.reasoningTokens : null;
  let totalTokens = usageSource === "PROVIDER_ENVELOPE" ? parsed.usage.totalTokens : null;
  if (usageSource === "PROVIDER_ENVELOPE" && (inputTokens > reservation.reservedInputTokens
    || outputTokens > reservation.reservedOutputTokens || totalTokens > reservation.reservedTokens)) attemptStatus = "CAP_INTEGRITY_FAILED";
  const estimatedCostUsd = transportResult.providerEventCount === 0 && transportResult.httpRequestCount === 0
    ? 0
    : usageSource === "PROVIDER_ENVELOPE"
      ? estimateCost(inputTokens, outputTokens, input.priceSnapshot)
      : reservation.reservedUsd;
  const providerEventReceipt = sealV5R3Artifact({
    schemaVersion: "ProviderEventReceiptV4",
    reservationHash: reservation.selfHash,
    authorizationHash: input.authorization.selfHash,
    requestArtifactHash: input.requestArtifact.selfHash,
    dispatchPermitHash: permit.selfHash,
    dispatchPermit: structuredClone(permit),
    attemptId: input.requestArtifact.attemptId,
    role: input.requestArtifact.role,
    itemHash: input.requestArtifact.itemHash,
    itemIdPseudonym: input.requestArtifact.itemIdPseudonym,
    clusterId: input.requestArtifact.clusterId,
    provider: input.authorization.provider,
    requestedModel: input.authorization.model,
    observedModel: parsed?.observedModel ?? null,
    requestedEndpoint: input.authorization.endpoint,
    observedEndpoint: transportResult.observedEndpoint,
    projectIdentityHash: input.authorization.projectIdentityHash,
    requestBodyHash: transportResult.requestBodyHash,
    responseBodyHash: transportResult.responseBodyHash,
    providerRequestId: transportResult.providerRequestId,
    startedAt: transportResult.startedAt,
    finishedAt: transportResult.finishedAt,
    latencyMs: transportResult.latencyMs,
    transportStatus: transportResult.transportStatus,
    bodyReadStatus: transportResult.bodyReadStatus,
    httpStatus: transportResult.httpStatus,
    providerEventCount: transportResult.providerEventCount,
    httpRequestCount: transportResult.httpRequestCount,
    parseStatus,
    schemaStatus,
    finishReason: parsed?.finishReason ?? null,
    attemptStatus,
    usageSource,
    inputTokens,
    outputTokens,
    reasoningTokens,
    totalTokens,
    priceSnapshotHash: input.priceSnapshot.selfHash,
    estimatedCostUsd,
    reservedInputTokens: reservation.reservedInputTokens,
    reservedOutputTokens: reservation.reservedOutputTokens,
    reservedTokens: reservation.reservedTokens,
    reservedCostUsd: reservation.reservedUsd,
    providerInvoiceAuthoritative: true,
  });
  assertClosedSelfHashedArtifactV5R4(providerEventReceipt, "ProviderEventReceiptV4");
  const roleOutput = attemptStatus === "SUCCEEDED" ? sealV5R3Artifact({
    schemaVersion: "ProviderRoleOutputV1",
    designId: "MAIS-NATURAL-CA60-V5",
    runnerRegistrationHash: input.registration.selfHash,
    sampleExecutionInventoryHash: input.inventory.selfHash,
    authorizationHash: input.authorization.selfHash,
    provider: input.authorization.provider,
    model: input.authorization.model,
    endpoint: input.authorization.endpoint,
    role: input.requestArtifact.role,
    attemptId: input.requestArtifact.attemptId,
    attemptReceiptHash: providerEventReceipt.selfHash,
    requestArtifactHash: input.requestArtifact.selfHash,
    itemHash: input.requestArtifact.itemHash,
    itemIdPseudonym: input.requestArtifact.itemIdPseudonym,
    clusterId: input.requestArtifact.clusterId,
    rolePromptHash: input.requestArtifact.rolePromptHash,
    roleSchemaHash: input.requestArtifact.roleSchemaHash,
    parsedPayload: structuredClone(parsed.parsedPayload),
    parsedPayloadHash: parsed.parsedPayloadHash ?? sha256V5R3(canonicalJsonV5R3(parsed.parsedPayload)),
    referenceInputCount: 0,
    deepSeekInputCount: 0,
  }) : null;
  if (roleOutput) assertClosedSelfHashedArtifactV5R4(roleOutput, "ProviderRoleOutputV1");
  const completion = await input.ledger.complete({ reservationHash: reservation.selfHash, providerEventReceipt, roleOutput });
  return Object.freeze({
    schemaVersion: "GuardedProviderAttemptRunV5R4",
    status: attemptStatus,
    dispatchAllowed: true,
    credentialReadCount: transportResult.credentialReadCount,
    providerEventCount: transportResult.providerEventCount,
    httpRequestCount: transportResult.httpRequestCount,
    reservation,
    permit,
    providerEventReceipt,
    roleOutput,
    completion,
    errors: Object.freeze([]),
  });
}
