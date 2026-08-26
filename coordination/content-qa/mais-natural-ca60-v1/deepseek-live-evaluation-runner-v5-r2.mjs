import DESIGN_REGISTRATION from "../../research/mais-natural-ca60-v1/versions/design-v5/design-registration.json" with { type: "json" };
import { jcsHash, sha256Hex } from "../../research/mais-natural-ca60-v1/versions/design-v5/design-contract.mjs";
import { evaluateDeepSeekLiveDispatchPreflightV5R2 } from "./deepseek-authorization-guard-v5-r2.mjs";
import { buildDeepSeekProviderAttemptPayloadV2 } from "./deepseek-attempt-receipt-v5-r2.mjs";
import { parseDeepSeekEvaluationResponseV5R2 } from "./deepseek-evaluation-adapter-v5-r2.mjs";

const PROVIDER = "DEEPSEEK_DIRECT";
const MODEL = "deepseek-v4-pro";
const ENDPOINT = "https://api.deepseek.com/chat/completions";
const PROJECT_RESIDENCY = "UNKNOWN_PENDING_ROUTE_PROBE_EVIDENCE";

function latency({ startedAt, finishedAt }) {
  const started = Date.parse(startedAt);
  const finished = Date.parse(finishedAt);
  if (![started, finished].every(Number.isFinite) || finished < started) throw new Error("DeepSeek attempt timestamps are invalid");
  return finished - started;
}

function commonAttemptFields(input, transportResult) {
  return {
    runId: input.runId,
    registrationHash: input.authorization.registrationHash,
    frameRegistrationHash: input.authorization.frameRegistrationHash,
    sampleManifestHash: input.authorization.sampleManifestHash,
    authorizationHash: input.authorization.authorizationHash,
    referenceSealHash: input.authorization.referenceSealHash,
    executionRegistrationHash: input.executionRegistrationHash,
    itemIdPseudonym: input.request.itemIdPseudonym,
    itemHash: input.request.itemHash,
    clusterId: input.request.clusterId,
    role: input.request.role,
    attemptId: input.attemptId,
    requestedProvider: PROVIDER,
    observedProvider: PROVIDER,
    requestedModel: MODEL,
    requestedEndpoint: ENDPOINT,
    observedEndpoint: transportResult.observedEndpoint ?? null,
    projectResidency: PROJECT_RESIDENCY,
    providerRequestId: transportResult.providerRequestId ?? null,
    requestBodyHash: transportResult.requestBodyHash,
    logicalRequestHash: input.request.logicalRequestHash,
    wireRequestBodyHash: transportResult.requestBodyHash,
    reasoningContextRequested: "NOT_APPLICABLE",
    reasoningContextObserved: "NOT_APPLICABLE",
    storeRequested: false,
    backgroundRequested: false,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    latencyMs: latency(input),
    costRateSnapshotHash: input.costRateSnapshotHash,
    estimatedCost: input.estimatedCost,
    cumulativeCost: input.cumulativeCost,
  };
}

async function appendFailure(input, transportResult, {
  attemptStatus,
  parseStatus,
  schemaStatus,
  responseEnvelope = null,
}) {
  if (typeof input.receiptStore?.append !== "function") throw new Error("DeepSeek attempt receipt store is missing");
  const payload = buildDeepSeekProviderAttemptPayloadV2({
    ...commonAttemptFields(input, transportResult),
    observedModel: typeof responseEnvelope?.model === "string" ? responseEnvelope.model : null,
    responseId: typeof responseEnvelope?.id === "string" ? responseEnvelope.id : null,
    responseBodyHash: typeof transportResult.rawResponseBody === "string" ? sha256Hex(transportResult.rawResponseBody) : null,
    parsedOutputHash: null,
    httpStatus: transportResult.httpStatus,
    finishReason: null,
    parseStatus,
    schemaStatus,
    attemptStatus,
    inputTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0,
    totalTokens: 0,
    retryClassification: attemptStatus,
    redactedError: attemptStatus,
  });
  return input.receiptStore.append(payload);
}

function failedResult(transportResult, attemptReceipt, errors = []) {
  return Object.freeze({
    schemaVersion: "DeepSeekEvaluationAttemptRunV5R2",
    status: attemptReceipt.attemptStatus,
    dispatchAllowed: true,
    providerEventCount: transportResult.providerEventCount,
    httpRequestCount: transportResult.httpRequestCount,
    credentialReadCount: 1,
    attemptReceipt,
    roleOutput: null,
    errors: Object.freeze(errors),
  });
}

function buildRoleOutput(input, attemptReceipt, parsed) {
  const catalog = DESIGN_REGISTRATION.providerControls.deepSeekRoleContractCatalog.roles[input.request.role];
  const body = {
    schemaVersion: "DeepSeekEvaluationRoleOutputV5R2",
    designId: "MAIS-NATURAL-CA60-V5",
    registrationHash: DESIGN_REGISTRATION.registrationHash,
    referenceSealHash: input.authorization.referenceSealHash,
    executionRegistrationHash: input.executionRegistrationHash,
    itemIdPseudonym: input.request.itemIdPseudonym,
    itemHash: input.request.itemHash,
    clusterId: input.request.clusterId,
    role: input.request.role,
    provider: PROVIDER,
    requestedModel: MODEL,
    observedModel: parsed.observedModel,
    responseId: parsed.responseId,
    attemptReceiptHash: attemptReceipt.selfHash,
    promptHash: catalog.promptHash,
    responseSchemaHash: catalog.schemaHash,
    parsedPayload: structuredClone(parsed.structuredPayload),
    parsedPayloadHash: parsed.structuredPayloadHash,
    referenceInputCount: 0,
  };
  return Object.freeze({ ...body, selfHash: jcsHash(body) });
}

export async function runDeepSeekEvaluationAttemptV5R2(input = {}) {
  const preflight = evaluateDeepSeekLiveDispatchPreflightV5R2(input);
  if (!preflight.dispatchAllowed) {
    return Object.freeze({
      schemaVersion: "DeepSeekEvaluationAttemptRunV5R2",
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
  if (!/^[0-9a-f]{64}$/u.test(input.executionRegistrationHash ?? "")) {
    return Object.freeze({
      schemaVersion: "DeepSeekEvaluationAttemptRunV5R2",
      status: "EXECUTION_REGISTRATION_BLOCKED",
      dispatchAllowed: false,
      providerEventCount: 0,
      httpRequestCount: 0,
      credentialReadCount: 0,
      attemptReceipt: null,
      roleOutput: null,
      errors: Object.freeze(["DeepSeek execution registration hash is missing"]),
    });
  }
  const transportResult = await input.transport.send({ permit: preflight.permit, wireRequest: input.request.wireRequest });
  if (transportResult.transportStatus !== "DELIVERED"
    || !Number.isSafeInteger(transportResult.httpStatus)
    || transportResult.httpStatus < 200 || transportResult.httpStatus > 299) {
    const attemptReceipt = await appendFailure(input, transportResult, {
      attemptStatus: transportResult.transportStatus,
      parseStatus: "NOT_PARSED",
      schemaStatus: "NOT_EVALUATED",
    });
    return failedResult(transportResult, attemptReceipt);
  }
  let responseEnvelope;
  try {
    responseEnvelope = JSON.parse(transportResult.rawResponseBody);
  } catch {
    const attemptReceipt = await appendFailure(input, transportResult, {
      attemptStatus: "MALFORMED_200",
      parseStatus: "MALFORMED",
      schemaStatus: "NOT_EVALUATED",
    });
    return failedResult(transportResult, attemptReceipt);
  }
  let parsed;
  try {
    parsed = parseDeepSeekEvaluationResponseV5R2({
      request: {
        schemaVersion: "DeepSeekEvaluationRequestV5R2",
        designId: "MAIS-NATURAL-CA60-V5",
        registrationHash: DESIGN_REGISTRATION.registrationHash,
        provider: input.request.provider,
        endpoint: input.request.endpoint,
        model: input.request.model,
        role: input.request.role,
        logicalRequest: input.request.logicalRequest,
        logicalRequestHash: input.request.logicalRequestHash,
        wireRequestBody: input.request.wireRequest,
        wireRequestBodyBytes: JSON.stringify(input.request.wireRequest),
        wireRequestBodyHash: input.request.wireRequestBodyHash,
        adapterTransformVersion: "BOUND_BY_ADAPTER_HASH",
        adapterTransformHash: input.request.adapterTransformHash,
        referenceInputCount: 0,
      },
      rawResponseBody: transportResult.rawResponseBody,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "DeepSeek response parse failure";
    const malformed = /not valid JSON/iu.test(message);
    const attemptReceipt = await appendFailure(input, transportResult, {
      attemptStatus: malformed ? "MALFORMED_200" : "SCHEMA_FAILURE",
      parseStatus: malformed ? "MALFORMED" : "PARSED",
      schemaStatus: malformed ? "NOT_EVALUATED" : "INVALID",
      responseEnvelope,
    });
    return failedResult(transportResult, attemptReceipt, [message]);
  }
  const payload = buildDeepSeekProviderAttemptPayloadV2({
    ...commonAttemptFields(input, transportResult),
    observedModel: parsed.observedModel,
    responseId: parsed.responseId,
    responseBodyHash: parsed.responseBodyHash,
    parsedOutputHash: parsed.structuredPayloadHash,
    httpStatus: transportResult.httpStatus,
    finishReason: parsed.finishReason,
    parseStatus: "PARSED",
    schemaStatus: "VALID",
    attemptStatus: "SUCCEEDED",
    inputTokens: parsed.usage.inputTokens,
    outputTokens: parsed.usage.outputTokens,
    reasoningTokens: parsed.usage.reasoningTokens,
    totalTokens: parsed.usage.totalTokens,
    retryClassification: "NOT_A_RETRY",
    redactedError: null,
  });
  const attemptReceipt = await input.receiptStore.append(payload);
  const roleOutput = buildRoleOutput(input, attemptReceipt, parsed);
  return Object.freeze({
    schemaVersion: "DeepSeekEvaluationAttemptRunV5R2",
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
