import {
  evaluateOpenAILiveDispatchPreflightV5R2,
} from "./authorization-guard-v5.mjs";
import {
  buildOpenAIReferenceRoleOutputV1,
  buildProviderAttemptPayloadV2,
  parseOpenAIReferenceLiveResponseV5R2,
  sha256Bytes,
} from "./openai-reference-adapter-v5.mjs";

function attemptLatency(input) {
  const started = Date.parse(input.startedAt);
  const finished = Date.parse(input.finishedAt);
  if (![started, finished].every(Number.isFinite) || finished < started) throw new Error("attempt timestamps are invalid");
  return finished - started;
}

async function appendTransportFailure(input, transportResult) {
  if (typeof input.receiptStore?.append !== "function") throw new Error("attempt receipt store is missing");
  const payload = buildProviderAttemptPayloadV2({
    runId: input.runId,
    registrationHash: input.authorization.registrationHash,
    frameRegistrationHash: input.authorization.frameRegistrationHash,
    sampleManifestHash: input.authorization.sampleManifestHash,
    authorizationHash: input.authorization.authorizationHash,
    referenceSealHash: null,
    executionRegistrationHash: null,
    itemIdPseudonym: input.request.itemIdPseudonym,
    itemHash: input.request.itemHash,
    clusterId: input.request.clusterId,
    role: input.request.role,
    attemptId: input.attemptId,
    requestedProvider: "OPENAI_DIRECT",
    observedProvider: "OPENAI_DIRECT",
    requestedModel: "gpt-5.6-luna",
    observedModel: null,
    requestedEndpoint: "https://us.api.openai.com/v1/responses",
    observedEndpoint: transportResult.observedEndpoint ?? null,
    projectResidency: "US_STORAGE_PROCESSING",
    responseId: null,
    providerRequestId: transportResult.providerRequestId ?? null,
    requestBodyHash: transportResult.requestBodyHash,
    responseBodyHash: typeof transportResult.rawResponseBody === "string"
      ? sha256Bytes(transportResult.rawResponseBody)
      : null,
    parsedOutputHash: null,
    logicalRequestHash: input.request.logicalRequest.logicalRequestHash,
    wireRequestBodyHash: transportResult.requestBodyHash,
    reasoningContextRequested: "current_turn",
    reasoningContextObserved: "UNOBSERVED",
    storeRequested: false,
    backgroundRequested: false,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    latencyMs: attemptLatency(input),
    httpStatus: transportResult.httpStatus,
    finishReason: null,
    parseStatus: "NOT_PARSED",
    schemaStatus: "NOT_EVALUATED",
    attemptStatus: transportResult.transportStatus,
    inputTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0,
    totalTokens: 0,
    costRateSnapshotHash: input.costRateSnapshotHash,
    estimatedCost: input.estimatedCost,
    cumulativeCost: input.cumulativeCost,
    retryClassification: transportResult.retryClassification,
    redactedError: transportResult.transportStatus,
  });
  return input.receiptStore.append(payload);
}

async function appendParseFailure(input, transportResult, {
  attemptStatus,
  parseStatus,
  schemaStatus,
  responseEnvelope = null,
}) {
  if (typeof input.receiptStore?.append !== "function") throw new Error("attempt receipt store is missing");
  const payload = buildProviderAttemptPayloadV2({
    runId: input.runId,
    registrationHash: input.authorization.registrationHash,
    frameRegistrationHash: input.authorization.frameRegistrationHash,
    sampleManifestHash: input.authorization.sampleManifestHash,
    authorizationHash: input.authorization.authorizationHash,
    referenceSealHash: null,
    executionRegistrationHash: null,
    itemIdPseudonym: input.request.itemIdPseudonym,
    itemHash: input.request.itemHash,
    clusterId: input.request.clusterId,
    role: input.request.role,
    attemptId: input.attemptId,
    requestedProvider: "OPENAI_DIRECT",
    observedProvider: "OPENAI_DIRECT",
    requestedModel: "gpt-5.6-luna",
    observedModel: typeof responseEnvelope?.model === "string" ? responseEnvelope.model : null,
    requestedEndpoint: "https://us.api.openai.com/v1/responses",
    observedEndpoint: transportResult.observedEndpoint,
    projectResidency: "US_STORAGE_PROCESSING",
    responseId: typeof responseEnvelope?.id === "string" ? responseEnvelope.id : null,
    providerRequestId: transportResult.providerRequestId ?? null,
    requestBodyHash: transportResult.requestBodyHash,
    responseBodyHash: sha256Bytes(transportResult.rawResponseBody),
    parsedOutputHash: null,
    logicalRequestHash: input.request.logicalRequest.logicalRequestHash,
    wireRequestBodyHash: transportResult.requestBodyHash,
    reasoningContextRequested: "current_turn",
    reasoningContextObserved: "UNOBSERVED",
    storeRequested: false,
    backgroundRequested: false,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    latencyMs: attemptLatency(input),
    httpStatus: transportResult.httpStatus,
    finishReason: null,
    parseStatus,
    schemaStatus,
    attemptStatus,
    inputTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0,
    totalTokens: 0,
    costRateSnapshotHash: input.costRateSnapshotHash,
    estimatedCost: input.estimatedCost,
    cumulativeCost: input.cumulativeCost,
    retryClassification: attemptStatus,
    redactedError: attemptStatus,
  });
  return input.receiptStore.append(payload);
}

function failedRunResult(transportResult, attemptReceipt) {
  return Object.freeze({
    schemaVersion: "OpenAIReferenceAttemptRunV1",
    status: attemptReceipt.attemptStatus,
    dispatchAllowed: true,
    providerEventCount: transportResult.providerEventCount,
    httpRequestCount: transportResult.httpRequestCount,
    credentialReadCount: 1,
    attemptReceipt,
    roleOutput: null,
    errors: Object.freeze([]),
  });
}

export async function runOpenAIReferenceAttemptV5R2(input = {}) {
  const preflight = evaluateOpenAILiveDispatchPreflightV5R2(input);
  if (!preflight.dispatchAllowed) {
    return Object.freeze({
      schemaVersion: "OpenAIReferenceAttemptRunV1",
      status: "AUTHORIZATION_BLOCKED",
      dispatchAllowed: false,
      providerEventCount: 0,
      httpRequestCount: 0,
      credentialReadCount: 0,
      attemptReceipt: null,
      roleOutput: null,
      errors: preflight.errors,
    });
  }
  const transportResult = await input.transport.send({
    permit: preflight.permit,
    wireRequest: input.request.wireRequest,
  });
  if (transportResult.transportStatus !== "DELIVERED"
    || !Number.isSafeInteger(transportResult.httpStatus)
    || transportResult.httpStatus < 200
    || transportResult.httpStatus > 299) {
    const attemptReceipt = await appendTransportFailure(input, transportResult);
    return Object.freeze({
      schemaVersion: "OpenAIReferenceAttemptRunV1",
      status: transportResult.transportStatus,
      dispatchAllowed: true,
      providerEventCount: transportResult.providerEventCount,
      httpRequestCount: transportResult.httpRequestCount,
      credentialReadCount: 1,
      attemptReceipt,
      roleOutput: null,
      errors: Object.freeze([]),
    });
  }
  let responseEnvelope;
  try {
    responseEnvelope = JSON.parse(transportResult.rawResponseBody);
  } catch {
    const attemptReceipt = await appendParseFailure(input, transportResult, {
      attemptStatus: "MALFORMED_200",
      parseStatus: "MALFORMED",
      schemaStatus: "NOT_EVALUATED",
    });
    return failedRunResult(transportResult, attemptReceipt);
  }
  let parsed;
  try {
    parsed = parseOpenAIReferenceLiveResponseV5R2({
      role: input.request.role,
      logicalRequest: input.request.logicalRequest,
      wireRequest: input.request.wireRequest,
      rawResponseBody: transportResult.rawResponseBody,
      responseEnvelope,
      responseHeaders: transportResult.providerRequestId
        ? { "x-request-id": transportResult.providerRequestId }
        : {},
    });
  } catch (error) {
    const malformed = /not valid JSON|malformed/iu.test(error instanceof Error ? error.message : "");
    const attemptReceipt = await appendParseFailure(input, transportResult, {
      attemptStatus: malformed ? "MALFORMED_200" : "SCHEMA_FAILURE",
      parseStatus: malformed ? "MALFORMED" : "PARSED",
      schemaStatus: malformed ? "NOT_EVALUATED" : "INVALID",
      responseEnvelope,
    });
    return failedRunResult(transportResult, attemptReceipt);
  }
  if (typeof input.receiptStore?.append !== "function") throw new Error("attempt receipt store is missing");
  const payload = buildProviderAttemptPayloadV2({
    runId: input.runId,
    registrationHash: input.authorization.registrationHash,
    frameRegistrationHash: input.authorization.frameRegistrationHash,
    sampleManifestHash: input.authorization.sampleManifestHash,
    authorizationHash: input.authorization.authorizationHash,
    referenceSealHash: null,
    executionRegistrationHash: null,
    itemIdPseudonym: input.request.itemIdPseudonym,
    itemHash: input.request.itemHash,
    clusterId: input.request.clusterId,
    role: input.request.role,
    attemptId: input.attemptId,
    requestedProvider: "OPENAI_DIRECT",
    observedProvider: "OPENAI_DIRECT",
    requestedModel: "gpt-5.6-luna",
    observedModel: parsed.observedModel,
    requestedEndpoint: "https://us.api.openai.com/v1/responses",
    observedEndpoint: transportResult.observedEndpoint,
    projectResidency: "US_STORAGE_PROCESSING",
    responseId: parsed.responseId,
    providerRequestId: transportResult.providerRequestId,
    requestBodyHash: transportResult.requestBodyHash,
    responseBodyHash: sha256Bytes(transportResult.rawResponseBody),
    parsedOutputHash: parsed.structuredPayloadHash,
    logicalRequestHash: input.request.logicalRequest.logicalRequestHash,
    wireRequestBodyHash: transportResult.requestBodyHash,
    reasoningContextRequested: "current_turn",
    reasoningContextObserved: parsed.attemptReasoningContextObserved,
    storeRequested: false,
    backgroundRequested: false,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    latencyMs: attemptLatency(input),
    httpStatus: transportResult.httpStatus,
    finishReason: "completed",
    parseStatus: "PARSED",
    schemaStatus: "VALID",
    attemptStatus: "SUCCEEDED",
    inputTokens: parsed.usage.inputTokens,
    outputTokens: parsed.usage.outputTokens,
    reasoningTokens: parsed.usage.reasoningTokens,
    totalTokens: parsed.usage.totalTokens,
    costRateSnapshotHash: input.costRateSnapshotHash,
    estimatedCost: input.estimatedCost,
    cumulativeCost: input.cumulativeCost,
    retryClassification: input.retryClassification,
    redactedError: null,
  });
  const attemptReceipt = await input.receiptStore.append(payload);
  const roleOutput = buildOpenAIReferenceRoleOutputV1({
    attemptReceipt,
    logicalRequest: input.request.logicalRequest,
    structuredPayload: parsed.structuredPayload,
  });
  return Object.freeze({
    schemaVersion: "OpenAIReferenceAttemptRunV1",
    status: "SUCCEEDED",
    dispatchAllowed: true,
    providerEventCount: transportResult.providerEventCount,
    httpRequestCount: transportResult.httpRequestCount,
    credentialReadCount: 1,
    attemptReceipt,
    roleOutput,
    errors: Object.freeze([]),
  });
}
