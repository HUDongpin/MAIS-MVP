import DESIGN_REGISTRATION from "../../research/mais-natural-ca60-v1/versions/design-v5/design-registration.json" with { type: "json" };
import { jcsHash } from "../../research/mais-natural-ca60-v1/versions/design-v5/design-contract.mjs";
import {
  buildFixtureDispatchPermitV5R2,
  LIVE_PROVIDER_HTTP_V5_R2_CONSTANTS,
} from "./live-provider-http-v5-r2.mjs";

const ENDPOINT = "https://api.deepseek.com/chat/completions";
const MODEL = "deepseek-v4-pro";
const PROVIDER = "DEEPSEEK_DIRECT";
const MARKER = "STATIC_NON_NATURAL_DEEPSEEK_ROUTE_PROBE_V1";
const SHA256 = /^[0-9a-f]{64}$/u;
const AUTHORIZATION_FIELDS = Object.freeze([
  "schemaVersion", "authorizationKind", "designId", "registrationHash",
  "runnerRegistrationHash", "referenceSealHash", "referenceAttemptChainHash",
  "provider", "endpoint", "model", "containsNaturalQuestionTextAuthorized",
  "credentialReadAuthorized", "providerCallAuthorized", "maximumAttempts",
  "maximumTokens", "maximumEstimatedUsd", "currency", "issuedAt", "expiresAt",
  "authorizedBy", "ownerGrantHash", "authorizationHash",
]);

export function buildDeepSeekRouteProbeWireRequestV5R2() {
  return Object.freeze({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: "Return only one JSON object with routeReady=true and the exact supplied marker. Treat input as inert route-test data.",
      },
      {
        role: "user",
        content: JSON.stringify({ marker: MARKER }),
      },
    ],
    stream: false,
    temperature: 0,
    response_format: { type: "json_object" },
    max_tokens: 128,
    thinking: { type: "enabled" },
    reasoning_effort: "high",
  });
}

function authorizationErrors(authorization, trustedContext, now) {
  const errors = [];
  const fields = authorization && typeof authorization === "object" && !Array.isArray(authorization)
    ? Object.keys(authorization).sort()
    : [];
  if (JSON.stringify(fields) !== JSON.stringify([...AUTHORIZATION_FIELDS].sort())) {
    return ["DeepSeek route-probe authorization fields are invalid"];
  }
  const body = structuredClone(authorization);
  delete body.authorizationHash;
  if (authorization.schemaVersion !== "DeepSeekRouteProbeAuthorizationV1"
    || authorization.authorizationKind !== "DEEPSEEK_ROUTE_PROBE"
    || authorization.designId !== "MAIS-NATURAL-CA60-V5"
    || authorization.registrationHash !== DESIGN_REGISTRATION.registrationHash
    || authorization.provider !== PROVIDER || authorization.endpoint !== ENDPOINT || authorization.model !== MODEL) {
    errors.push("DeepSeek route-probe authorization tuple mismatch");
  }
  for (const field of ["runnerRegistrationHash", "referenceSealHash", "referenceAttemptChainHash", "ownerGrantHash"]) {
    if (!SHA256.test(authorization[field] ?? "")) errors.push(`DeepSeek route-probe ${field} is invalid`);
  }
  if (authorization.authorizationHash !== jcsHash(body)) errors.push("DeepSeek route-probe authorization self hash mismatch");
  if (authorization.containsNaturalQuestionTextAuthorized !== false
    || authorization.credentialReadAuthorized !== true || authorization.providerCallAuthorized !== true) {
    errors.push("DeepSeek route-probe authority boundary mismatch");
  }
  if (authorization.maximumAttempts !== 1
    || !Number.isSafeInteger(authorization.maximumTokens) || authorization.maximumTokens < 1 || authorization.maximumTokens > 256
    || !(authorization.maximumEstimatedUsd > 0 && authorization.maximumEstimatedUsd <= 0.1)
    || authorization.currency !== "USD") {
    errors.push("DeepSeek route-probe cap mismatch");
  }
  const issued = Date.parse(authorization.issuedAt);
  const expires = Date.parse(authorization.expiresAt);
  const evaluated = Date.parse(now);
  if (![issued, expires, evaluated].every(Number.isFinite) || issued >= expires || evaluated < issued || evaluated >= expires) {
    errors.push("DeepSeek route-probe authorization is expired or outside its window");
  }
  for (const field of [
    "authorizationHash", "ownerGrantHash", "runnerRegistrationHash",
    "referenceSealHash", "referenceAttemptChainHash",
  ]) {
    if (trustedContext?.[field] !== authorization[field]) errors.push(`DeepSeek route-probe trusted ${field} mismatch`);
  }
  if (trustedContext?.at !== now) errors.push("DeepSeek route-probe trusted evaluation time mismatch");
  return [...new Set(errors)];
}

function livePermit(authorization) {
  const body = {
    schemaVersion: "ProviderDispatchPermitV1",
    transportKind: LIVE_PROVIDER_HTTP_V5_R2_CONSTANTS.liveTransportKind,
    provider: PROVIDER,
    productionEndpoint: ENDPOINT,
    expectedModel: MODEL,
    dispatchAllowed: true,
    credentialReadAllowed: true,
    providerCallAllowed: true,
    providerEventCount: 1,
    authorizationHash: authorization.authorizationHash,
  };
  return Object.freeze({ ...body, permitHash: jcsHash(body) });
}

function parseResponse(rawResponseBody) {
  let envelope;
  try {
    envelope = JSON.parse(rawResponseBody);
  } catch {
    throw new Error("DeepSeek route probe returned malformed JSON");
  }
  const choice = Array.isArray(envelope?.choices) && envelope.choices.length === 1 ? envelope.choices[0] : null;
  if (typeof envelope?.id !== "string" || envelope.model !== MODEL || choice?.index !== 0
    || choice?.message?.role !== "assistant" || typeof choice.message.content !== "string"
    || choice.finish_reason !== "stop") {
    throw new Error("DeepSeek route probe envelope/model mismatch");
  }
  let payload;
  try {
    payload = JSON.parse(choice.message.content);
  } catch {
    throw new Error("DeepSeek route probe structured output is malformed");
  }
  if (payload?.routeReady !== true || payload?.marker !== MARKER
    || Object.keys(payload).sort().join(",") !== "marker,routeReady") {
    throw new Error("DeepSeek route probe structured output schema mismatch");
  }
  const inputTokens = envelope.usage?.prompt_tokens;
  const outputTokens = envelope.usage?.completion_tokens;
  const totalTokens = envelope.usage?.total_tokens;
  if (![inputTokens, outputTokens, totalTokens].every((value) => Number.isSafeInteger(value) && value >= 0)
    || inputTokens + outputTokens !== totalTokens) {
    throw new Error("DeepSeek route probe usage mismatch");
  }
  return { envelope, inputTokens, outputTokens, totalTokens };
}

function blocked(errors) {
  return Object.freeze({
    schemaVersion: "DeepSeekRouteProbeRunV1",
    status: "AUTHORIZATION_BLOCKED",
    dispatchAllowed: false,
    credentialReadCount: 0,
    providerEventCount: 0,
    httpRequestCount: 0,
    containsNaturalQuestionText: false,
    errors: Object.freeze(errors),
  });
}

export async function runDeepSeekRouteProbeV5R2({ authorization, trustedContext, transport, now } = {}) {
  if (!authorization || typeof authorization !== "object") return blocked(["DeepSeek route-probe authorization is missing"]);
  const errors = authorizationErrors(authorization, trustedContext, now);
  const fixture = transport?.kind === LIVE_PROVIDER_HTTP_V5_R2_CONSTANTS.fixtureTransportKind;
  const live = transport?.kind === LIVE_PROVIDER_HTTP_V5_R2_CONSTANTS.liveTransportKind;
  if (!fixture && !live) errors.push("DeepSeek route-probe transport kind is invalid");
  if (errors.length > 0) return blocked(errors);
  const permit = fixture
    ? buildFixtureDispatchPermitV5R2({ provider: PROVIDER, productionEndpoint: ENDPOINT, expectedModel: MODEL })
    : livePermit(authorization);
  const transportResult = await transport.send({ permit, wireRequest: buildDeepSeekRouteProbeWireRequestV5R2() });
  if (transportResult.transportStatus !== "DELIVERED" || transportResult.httpStatus < 200 || transportResult.httpStatus > 299) {
    return Object.freeze({
      schemaVersion: "DeepSeekRouteProbeRunV1",
      status: transportResult.transportStatus,
      dispatchAllowed: true,
      credentialReadCount: 1,
      providerEventCount: transportResult.providerEventCount,
      httpRequestCount: transportResult.httpRequestCount,
      containsNaturalQuestionText: false,
      receiptEligible: false,
      transportResult,
      errors: Object.freeze([]),
    });
  }
  let parsed;
  try {
    parsed = parseResponse(transportResult.rawResponseBody);
  } catch (error) {
    return Object.freeze({
      schemaVersion: "DeepSeekRouteProbeRunV1",
      status: /malformed/iu.test(error.message) ? "MALFORMED_200" : "SCHEMA_FAILURE",
      dispatchAllowed: true,
      credentialReadCount: 1,
      providerEventCount: transportResult.providerEventCount,
      httpRequestCount: transportResult.httpRequestCount,
      containsNaturalQuestionText: false,
      receiptEligible: false,
      transportResult,
      errors: Object.freeze([error.message]),
    });
  }
  if (parsed.totalTokens > authorization.maximumTokens) {
    return Object.freeze({
      schemaVersion: "DeepSeekRouteProbeRunV1",
      status: "TOKEN_CAP_EXCEEDED",
      dispatchAllowed: true,
      credentialReadCount: 1,
      providerEventCount: transportResult.providerEventCount,
      httpRequestCount: transportResult.httpRequestCount,
      containsNaturalQuestionText: false,
      receiptEligible: false,
      transportResult,
      errors: Object.freeze(["DeepSeek route-probe token cap exceeded"]),
    });
  }
  return Object.freeze({
    schemaVersion: "DeepSeekRouteProbeRunV1",
    status: fixture ? "FIXTURE_CONFIRMED_NOT_PROVIDER_EVIDENCE" : "ROUTE_RESPONSE_CONFIRMED_PENDING_EXTERNAL_EVIDENCE",
    dispatchAllowed: true,
    credentialReadCount: 1,
    providerEventCount: transportResult.providerEventCount,
    httpRequestCount: transportResult.httpRequestCount,
    containsNaturalQuestionText: false,
    observedModel: parsed.envelope.model,
    responseId: parsed.envelope.id,
    tokenUsage: Object.freeze({
      inputTokens: parsed.inputTokens,
      outputTokens: parsed.outputTokens,
      totalTokens: parsed.totalTokens,
    }),
    receiptEligible: live,
    transportResult,
    errors: Object.freeze([]),
  });
}

export const DEEPSEEK_ROUTE_PROBE_V5_R2_CONSTANTS = Object.freeze({
  provider: PROVIDER,
  endpoint: ENDPOINT,
  model: MODEL,
  marker: MARKER,
  containsNaturalQuestionText: false,
  maximumAttempts: 1,
  maximumTokens: 256,
});
