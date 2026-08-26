import { evaluateProviderAuthorizationV5R3 } from "./authorization-guard-v5-r3.mjs";
import {
  buildProviderEventReceiptV3,
  sealV5R3Artifact,
  sha256V5R3,
} from "./execution-integrity-v5-r3.mjs";
import { buildDispatchPermitV2 } from "./live-provider-http-v5-r3.mjs";

function safeEnvelope(rawResponseBody) {
  if (typeof rawResponseBody !== "string") return null;
  try {
    const value = JSON.parse(rawResponseBody);
    return value !== null && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

function blocked(errors) {
  return Object.freeze({
    schemaVersion: "GuardedProviderAttemptRunV5R3",
    status: "AUTHORIZATION_BLOCKED",
    dispatchAllowed: false,
    providerEventCount: 0,
    httpRequestCount: 0,
    credentialReadCount: 0,
    reservation: null,
    providerEventReceipt: null,
    completion: null,
    roleOutput: null,
    errors,
  });
}

export async function runGuardedProviderAttemptV5R3(input = {}) {
  const preflight = evaluateProviderAuthorizationV5R3(input);
  if (!preflight.dispatchAllowed) return blocked(preflight.errors);
  if (typeof input.ledger?.reserve !== "function" || typeof input.ledger?.complete !== "function") {
    return blocked(Object.freeze(["authoritative atomic execution ledger is unavailable"]));
  }
  const reservation = await input.ledger.reserve({
    attemptId: input.request.attemptId,
    role: input.request.role,
    itemHash: input.request.itemHash,
    itemIdPseudonym: input.request.itemIdPseudonym,
    clusterId: input.request.clusterId,
  });
  const permit = buildDispatchPermitV2({
    mode: "LIVE",
    authorization: input.authorization,
    runnerReview: input.review,
    reservation,
    projectIdentityHash: input.authorization.projectIdentityHash ?? null,
  });
  let transportResult;
  try {
    transportResult = await input.transport.send({ permit, wireRequest: input.request.wireRequest });
  } catch {
    transportResult = Object.freeze({
      transportStatus: "CONNECTION_LOST_AFTER_DISPATCH",
      bodyReadStatus: "NOT_AVAILABLE",
      providerEventCount: 0,
      httpRequestCount: 1,
      observedEndpoint: null,
      httpStatus: null,
      rawResponseBody: null,
    });
  }
  const responseEnvelope = safeEnvelope(transportResult.rawResponseBody);
  let status = transportResult.transportStatus;
  let parseStatus = responseEnvelope ? "PARSED" : (typeof transportResult.rawResponseBody === "string" ? "MALFORMED" : "NOT_PARSED");
  let schemaStatus = "NOT_EVALUATED";
  let parsed = null;
  let finishReason = typeof responseEnvelope?.finish_reason === "string"
    ? responseEnvelope.finish_reason
    : (typeof responseEnvelope?.status === "string" ? responseEnvelope.status : null);
  let observedModel = typeof responseEnvelope?.model === "string" ? responseEnvelope.model : null;
  if (transportResult.transportStatus === "DELIVERED") {
    if (!responseEnvelope) {
      status = "MALFORMED_200";
    } else {
      try {
        parsed = input.parseResponse({ responseEnvelope, rawResponseBody: transportResult.rawResponseBody, request: input.request });
        observedModel = parsed?.observedModel ?? observedModel;
        finishReason = parsed?.finishReason ?? finishReason;
        schemaStatus = "VALID";
        if (observedModel !== input.authorization.model) {
          status = "MODEL_DRIFT";
          schemaStatus = "INVALID";
        } else if (!["completed", "stop"].includes(finishReason)) {
          status = "FINISH_REASON_DRIFT";
          schemaStatus = "INVALID";
        } else {
          status = "SUCCEEDED";
        }
      } catch {
        status = "SCHEMA_FAILURE";
        schemaStatus = "INVALID";
      }
    }
  }
  const providerEventReceipt = buildProviderEventReceiptV3({
    reservation,
    provider: input.authorization.provider,
    requestedModel: input.authorization.model,
    observedModel,
    requestedEndpoint: input.authorization.endpoint,
    observedEndpoint: transportResult.observedEndpoint ?? null,
    transportStatus: transportResult.transportStatus,
    attemptStatus: status,
    bodyReadStatus: transportResult.bodyReadStatus ?? "NOT_AVAILABLE",
    httpStatus: transportResult.httpStatus ?? null,
    rawResponseBody: transportResult.rawResponseBody ?? null,
    responseEnvelope,
    parseStatus,
    schemaStatus,
    finishReason,
    priceSnapshot: input.priceSnapshot,
    completedAt: input.completedAt ?? input.now,
    providerEventCount: transportResult.providerEventCount ?? 0,
    httpRequestCount: transportResult.httpRequestCount ?? 0,
  });
  const completion = await input.ledger.complete({
    reservationHash: reservation.selfHash,
    providerEventReceipt,
    attemptStatus: status,
  });
  const roleOutput = status === "SUCCEEDED"
    ? sealV5R3Artifact({
      schemaVersion: input.authorization.provider === "OPENAI_DIRECT" ? "OpenAIReferenceRoleOutputV5R3" : "DeepSeekEvaluationRoleOutputV5R3",
      provider: input.authorization.provider,
      role: input.request.role,
      attemptId: input.request.attemptId,
      attemptReceiptHash: providerEventReceipt.selfHash,
      itemHash: input.request.itemHash,
      itemIdPseudonym: input.request.itemIdPseudonym,
      clusterId: input.request.clusterId,
      parsedPayload: structuredClone(parsed.parsedPayload),
      parsedPayloadHash: parsed.parsedPayloadHash ?? sha256V5R3(JSON.stringify(parsed.parsedPayload)),
      referenceInputCount: input.authorization.provider === "DEEPSEEK_DIRECT" ? 0 : null,
    })
    : null;
  return Object.freeze({
    schemaVersion: "GuardedProviderAttemptRunV5R3",
    status,
    dispatchAllowed: true,
    providerEventCount: transportResult.providerEventCount ?? 0,
    httpRequestCount: transportResult.httpRequestCount ?? 0,
    credentialReadCount: 1,
    reservation,
    providerEventReceipt,
    completion,
    roleOutput,
    errors: Object.freeze([]),
  });
}
