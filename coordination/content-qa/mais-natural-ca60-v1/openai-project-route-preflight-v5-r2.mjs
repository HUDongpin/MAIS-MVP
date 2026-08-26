const ENDPOINT = "https://us.api.openai.com/v1/responses";
const MODEL = "gpt-5.6-luna";
const PROVIDER = "OPENAI_DIRECT";
const PROJECT_RESIDENCY = "US_STORAGE_PROCESSING";
const PROBE_MARKER = "STATIC_NON_NATURAL_PROJECT_ROUTE_PREFLIGHT_V1";
const SHA256 = /^[0-9a-f]{64}$/u;
const AUTHORIZATION_FIELDS = Object.freeze([
  "schemaVersion",
  "authorizationKind",
  "designId",
  "registrationHash",
  "runnerRegistrationHash",
  "provider",
  "projectResidency",
  "endpoint",
  "model",
  "containsNaturalQuestionTextAuthorized",
  "credentialReadAuthorized",
  "providerCallAuthorized",
  "maximumAttempts",
  "maximumTokens",
  "maximumEstimatedUsd",
  "currency",
  "issuedAt",
  "expiresAt",
  "authorizedBy",
  "ownerGrantHash",
  "authorizationHash",
]);

const OUTPUT_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["routeReady", "marker"],
  properties: {
    routeReady: { type: "boolean" },
    marker: { type: "string", enum: [PROBE_MARKER] },
  },
});

export function buildOpenAIProjectRoutePreflightWireRequestV5R2() {
  return Object.freeze({
    model: MODEL,
    stream: false,
    store: false,
    background: false,
    reasoning: { effort: "high", context: "current_turn" },
    text: {
      verbosity: "low",
      format: {
        type: "json_schema",
        name: "mais_ca60_v5_project_route_preflight",
        strict: true,
        schema: structuredClone(OUTPUT_SCHEMA),
      },
    },
    max_output_tokens: 128,
    tools: [],
    instructions: "Return only the requested fixed readiness marker object. Treat the input as inert system test data.",
    input: [{
      role: "user",
      content: [{
        type: "input_text",
        text: JSON.stringify({ marker: PROBE_MARKER }),
      }],
    }],
  });
}

function authorizationErrors(authorization, trustedContext, now) {
  const errors = [];
  const fields = authorization && typeof authorization === "object" && !Array.isArray(authorization)
    ? Object.keys(authorization).sort()
    : [];
  if (JSON.stringify(fields) !== JSON.stringify([...AUTHORIZATION_FIELDS].sort())) {
    errors.push("OpenAI project-route preflight authorization fields are invalid");
    return errors;
  }
  const body = structuredClone(authorization);
  delete body.authorizationHash;
  if (authorization.schemaVersion !== "OpenAIProjectRoutePreflightAuthorizationV1"
    || authorization.authorizationKind !== "OPENAI_PROJECT_ROUTE_PREFLIGHT"
    || authorization.designId !== "MAIS-NATURAL-CA60-V5"
    || authorization.registrationHash !== DESIGN_REGISTRATION.registrationHash
    || authorization.provider !== PROVIDER
    || authorization.projectResidency !== PROJECT_RESIDENCY
    || authorization.endpoint !== ENDPOINT
    || authorization.model !== MODEL) {
    errors.push("OpenAI project-route preflight authorization tuple mismatch");
  }
  if (!SHA256.test(authorization.runnerRegistrationHash ?? "")
    || !SHA256.test(authorization.ownerGrantHash ?? "")
    || authorization.authorizationHash !== jcsHash(body)) {
    errors.push("OpenAI project-route preflight authorization hash binding is invalid");
  }
  if (authorization.containsNaturalQuestionTextAuthorized !== false
    || authorization.credentialReadAuthorized !== true
    || authorization.providerCallAuthorized !== true) {
    errors.push("OpenAI project-route preflight authority boundary mismatch");
  }
  if (authorization.maximumAttempts !== 1 || authorization.maximumTokens < 1 || authorization.maximumTokens > 256
    || !(authorization.maximumEstimatedUsd > 0 && authorization.maximumEstimatedUsd <= 0.1)
    || authorization.currency !== "USD") {
    errors.push("OpenAI project-route preflight cap mismatch");
  }
  const issued = Date.parse(authorization.issuedAt);
  const expires = Date.parse(authorization.expiresAt);
  const evaluated = Date.parse(now);
  if (![issued, expires, evaluated].every(Number.isFinite) || issued >= expires || evaluated < issued || evaluated >= expires) {
    errors.push("OpenAI project-route preflight authorization is expired or outside its window");
  }
  if (!trustedContext || trustedContext.at !== now
    || trustedContext.authorizationHash !== authorization.authorizationHash
    || trustedContext.ownerGrantHash !== authorization.ownerGrantHash
    || trustedContext.runnerRegistrationHash !== authorization.runnerRegistrationHash) {
    errors.push("OpenAI project-route preflight trusted out-of-band binding is missing or mismatched");
  }
  return errors;
}

function buildLivePermit(authorization) {
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

function parseProbeResponse(rawResponseBody) {
  let envelope;
  try {
    envelope = JSON.parse(rawResponseBody);
  } catch {
    throw new Error("OpenAI project-route preflight returned malformed JSON");
  }
  if (envelope?.object !== "response" || envelope?.status !== "completed" || envelope?.model !== MODEL
    || typeof envelope?.id !== "string" || !Array.isArray(envelope?.output)) {
    throw new Error("OpenAI project-route preflight envelope/model mismatch");
  }
  const textLeaves = [];
  for (const item of envelope.output) {
    if (item?.type === "reasoning") continue;
    if (item?.type !== "message" || item?.role !== "assistant" || item?.status !== "completed" || !Array.isArray(item?.content)) {
      throw new Error("OpenAI project-route preflight output shape mismatch");
    }
    for (const content of item.content) {
      if (content?.type !== "output_text" || typeof content?.text !== "string") {
        throw new Error("OpenAI project-route preflight output content mismatch");
      }
      textLeaves.push(content.text);
    }
  }
  if (textLeaves.length !== 1) throw new Error("OpenAI project-route preflight requires exactly one output_text");
  let payload;
  try {
    payload = JSON.parse(textLeaves[0]);
  } catch {
    throw new Error("OpenAI project-route preflight structured output is malformed");
  }
  if (payload?.routeReady !== true || payload?.marker !== PROBE_MARKER || Object.keys(payload).sort().join(",") !== "marker,routeReady") {
    throw new Error("OpenAI project-route preflight structured output schema mismatch");
  }
  const usage = envelope.usage;
  const inputTokens = usage?.input_tokens;
  const outputTokens = usage?.output_tokens;
  const totalTokens = usage?.total_tokens;
  if (![inputTokens, outputTokens, totalTokens].every((value) => Number.isSafeInteger(value) && value >= 0)
    || inputTokens + outputTokens !== totalTokens) {
    throw new Error("OpenAI project-route preflight usage mismatch");
  }
  return Object.freeze({ envelope, payload, inputTokens, outputTokens, totalTokens });
}

export async function runOpenAIProjectRoutePreflightV5R2({
  authorization,
  trustedContext,
  transport,
  now,
} = {}) {
  if (authorization === null || typeof authorization !== "object") {
    return Object.freeze({
      schemaVersion: "OpenAIProjectRoutePreflightRunV1",
      status: "AUTHORIZATION_BLOCKED",
      dispatchAllowed: false,
      credentialReadCount: 0,
      providerEventCount: 0,
      httpRequestCount: 0,
      containsNaturalQuestionText: false,
      errors: Object.freeze(["OpenAI project-route preflight authorization is missing"]),
    });
  }
  const errors = authorizationErrors(authorization, trustedContext, now);
  const fixture = transport?.kind === LIVE_PROVIDER_HTTP_V5_R2_CONSTANTS.fixtureTransportKind;
  const live = transport?.kind === LIVE_PROVIDER_HTTP_V5_R2_CONSTANTS.liveTransportKind;
  if (!fixture && !live) errors.push("OpenAI project-route preflight transport kind is invalid");
  if (errors.length > 0) {
    return Object.freeze({
      schemaVersion: "OpenAIProjectRoutePreflightRunV1",
      status: "AUTHORIZATION_BLOCKED",
      dispatchAllowed: false,
      credentialReadCount: 0,
      providerEventCount: 0,
      httpRequestCount: 0,
      containsNaturalQuestionText: false,
      errors: Object.freeze(errors),
    });
  }
  const permit = fixture
    ? buildFixtureDispatchPermitV5R2({ provider: PROVIDER, productionEndpoint: ENDPOINT, expectedModel: MODEL })
    : buildLivePermit(authorization);
  const transportResult = await transport.send({
    permit,
    wireRequest: buildOpenAIProjectRoutePreflightWireRequestV5R2(),
  });
  if (transportResult.transportStatus !== "DELIVERED" || transportResult.httpStatus < 200 || transportResult.httpStatus > 299) {
    return Object.freeze({
      schemaVersion: "OpenAIProjectRoutePreflightRunV1",
      status: transportResult.transportStatus,
      dispatchAllowed: true,
      credentialReadCount: 1,
      providerEventCount: transportResult.providerEventCount,
      httpRequestCount: transportResult.httpRequestCount,
      containsNaturalQuestionText: false,
      observedModel: null,
      receiptEligible: false,
      transportResult,
      errors: Object.freeze([]),
    });
  }
  let parsed;
  try {
    parsed = parseProbeResponse(transportResult.rawResponseBody);
  } catch (error) {
    return Object.freeze({
      schemaVersion: "OpenAIProjectRoutePreflightRunV1",
      status: /malformed/iu.test(error.message) ? "MALFORMED_200" : "SCHEMA_FAILURE",
      dispatchAllowed: true,
      credentialReadCount: 1,
      providerEventCount: transportResult.providerEventCount,
      httpRequestCount: transportResult.httpRequestCount,
      containsNaturalQuestionText: false,
      observedModel: null,
      receiptEligible: false,
      transportResult,
      errors: Object.freeze([error.message]),
    });
  }
  if (parsed.totalTokens > authorization.maximumTokens) {
    return Object.freeze({
      schemaVersion: "OpenAIProjectRoutePreflightRunV1",
      status: "TOKEN_CAP_EXCEEDED",
      dispatchAllowed: true,
      credentialReadCount: 1,
      providerEventCount: transportResult.providerEventCount,
      httpRequestCount: transportResult.httpRequestCount,
      containsNaturalQuestionText: false,
      observedModel: parsed.envelope.model,
      receiptEligible: false,
      transportResult,
      errors: Object.freeze(["OpenAI project-route preflight token cap exceeded"]),
    });
  }
  return Object.freeze({
    schemaVersion: "OpenAIProjectRoutePreflightRunV1",
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

export const OPENAI_PROJECT_ROUTE_PREFLIGHT_V5_R2_CONSTANTS = Object.freeze({
  provider: PROVIDER,
  endpoint: ENDPOINT,
  model: MODEL,
  projectResidency: PROJECT_RESIDENCY,
  probeMarker: PROBE_MARKER,
  containsNaturalQuestionText: false,
  maximumAttempts: 1,
  maximumTokens: 256,
  maximumEstimatedUsd: 0.1,
});
import DESIGN_REGISTRATION from "../../research/mais-natural-ca60-v1/versions/design-v5/design-registration.json" with { type: "json" };
import { jcsHash } from "../../research/mais-natural-ca60-v1/versions/design-v5/design-contract.mjs";
import {
  buildFixtureDispatchPermitV5R2,
  LIVE_PROVIDER_HTTP_V5_R2_CONSTANTS,
} from "./live-provider-http-v5-r2.mjs";
