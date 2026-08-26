import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
  validateSelfHashV5R3,
} from "./execution-integrity-v5-r3.mjs";

const TUPLES = Object.freeze({
  OPENAI_DIRECT: Object.freeze({ endpoint: "https://us.api.openai.com/v1/responses", model: "gpt-5.6-luna" }),
  DEEPSEEK_DIRECT: Object.freeze({ endpoint: "https://api.deepseek.com/chat/completions", model: "deepseek-v4-pro" }),
});

export function hashProjectIdentityV5R3(projectId) {
  if (typeof projectId !== "string" || projectId.length === 0) throw new TypeError("project identity is absent");
  return sha256V5R3(`OPENAI_PROJECT_IDENTITY_V1\n${projectId}`);
}

function validatePermit(permit) {
  if (!validateSelfHashV5R3(permit) || permit.schemaVersion !== "ProviderDispatchPermitV2") throw new Error("sealed provider dispatch permit V2 is required");
  if (permit.mode !== "LIVE") throw new Error("live transport requires LIVE permit mode");
  const tuple = TUPLES[permit.provider];
  if (!tuple || permit.endpoint !== tuple.endpoint || permit.model !== tuple.model) throw new Error("permit provider tuple is invalid");
  if (!/^[0-9a-f]{64}$/u.test(permit.reservationHash ?? "") || !/^[0-9a-f]{64}$/u.test(permit.runnerReviewReceiptHash ?? "")) throw new Error("permit reservation or runner review binding is invalid");
  if (permit.provider === "OPENAI_DIRECT" && !/^[0-9a-f]{64}$/u.test(permit.projectIdentityHash ?? "")) throw new Error("permit project identity binding is invalid");
  return tuple;
}

function headerValue(headers, name) {
  if (typeof headers?.get === "function") return headers.get(name);
  if (headers instanceof Map) return headers.get(name) ?? headers.get(name.toLowerCase()) ?? null;
  return null;
}

export function createLiveProviderTransportV5R3({ credentialReader, fetchImpl = globalThis.fetch }) {
  if (typeof credentialReader !== "function") throw new TypeError("credentialReader is required");
  if (typeof fetchImpl !== "function") throw new TypeError("fetch implementation is required");

  async function send({ permit, wireRequest }) {
    const tuple = validatePermit(permit);
    const wireBytes = canonicalJsonV5R3(wireRequest);
    const requestBodyHash = sha256V5R3(wireBytes);
    const credential = await credentialReader({ provider: permit.provider, authorizationHash: permit.authorizationHash });
    if (!credential || typeof credential.apiKey !== "string" || credential.apiKey.length === 0) throw new Error("provider credential is unavailable");
    let projectId = null;
    if (permit.provider === "OPENAI_DIRECT") {
      projectId = credential.projectId;
      if (hashProjectIdentityV5R3(projectId) !== permit.projectIdentityHash) throw new Error("OpenAI project identity does not match permit");
    }
    const headers = {
      Authorization: `Bearer ${credential.apiKey}`,
      "Content-Type": "application/json",
    };
    if (permit.provider === "OPENAI_DIRECT") headers["OpenAI-Project"] = projectId;
    let response;
    try {
      response = await fetchImpl(tuple.endpoint, {
        method: "POST",
        headers,
        body: wireBytes,
        redirect: "error",
      });
    } catch {
      return Object.freeze({
        schemaVersion: "ProviderTransportResultV5R3",
        transportStatus: "CONNECTION_LOST_AFTER_DISPATCH",
        bodyReadStatus: "NOT_AVAILABLE",
        providerEventCount: 0,
        httpRequestCount: 1,
        requestedEndpoint: tuple.endpoint,
        observedEndpoint: null,
        httpStatus: null,
        providerRequestId: null,
        requestBodyHash,
        rawResponseBody: null,
      });
    }
    const observedEndpoint = typeof response?.url === "string" && response.url.length > 0 ? response.url : tuple.endpoint;
    const common = {
      schemaVersion: "ProviderTransportResultV5R3",
      providerEventCount: 1,
      httpRequestCount: 1,
      requestedEndpoint: tuple.endpoint,
      observedEndpoint,
      httpStatus: Number.isSafeInteger(response?.status) ? response.status : null,
      providerRequestId: headerValue(response?.headers, "x-request-id"),
      requestBodyHash,
    };
    if (observedEndpoint !== tuple.endpoint) {
      return Object.freeze({ ...common, transportStatus: "PROVIDER_ORIGIN_DRIFT", bodyReadStatus: "NOT_ATTEMPTED_ORIGIN_DRIFT", rawResponseBody: null });
    }
    let rawResponseBody;
    try {
      rawResponseBody = await response.text();
    } catch {
      return Object.freeze({ ...common, transportStatus: "BODY_READ_FAILED_AFTER_DISPATCH", bodyReadStatus: "BODY_READ_FAILED_AFTER_DISPATCH", rawResponseBody: null });
    }
    const delivered = common.httpStatus !== null && common.httpStatus >= 200 && common.httpStatus <= 299;
    return Object.freeze({
      ...common,
      transportStatus: delivered ? "DELIVERED" : `HTTP_${common.httpStatus ?? "UNKNOWN"}`,
      bodyReadStatus: "BODY_READ_COMPLETE",
      rawResponseBody,
    });
  }

  return Object.freeze({ send });
}

export function buildDispatchPermitV2(input) {
  if (!validateSelfHashV5R3(input.authorization) || !validateSelfHashV5R3(input.runnerReview)
    || !validateSelfHashV5R3(input.reservation)) throw new TypeError("permit inputs must be sealed");
  return sealV5R3Artifact({
    schemaVersion: "ProviderDispatchPermitV2",
    mode: input.mode,
    provider: input.authorization.provider,
    endpoint: input.authorization.endpoint,
    model: input.authorization.model,
    authorizationHash: input.authorization.selfHash,
    runnerReviewReceiptHash: input.runnerReview.selfHash,
    reservationHash: input.reservation.selfHash,
    attemptId: input.reservation.attemptId,
    projectIdentityHash: input.projectIdentityHash ?? null,
  });
}
