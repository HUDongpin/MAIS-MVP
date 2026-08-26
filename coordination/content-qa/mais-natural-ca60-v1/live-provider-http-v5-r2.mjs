import {
  canonicalJson,
  jcsHash,
} from "../../research/mais-natural-ca60-v1/versions/design-v5/design-contract.mjs";

const FIXTURE_KIND = "FIXTURE_HTTP_LOOPBACK_NO_PROVIDER_EVENT_V1";
const LIVE_KIND = "LIVE_PROVIDER_HTTP_AUTHORIZED_V1";
const TUPLES = Object.freeze({
  OPENAI_DIRECT: Object.freeze({
    endpoint: "https://us.api.openai.com/v1/responses",
    model: "gpt-5.6-luna",
  }),
  DEEPSEEK_DIRECT: Object.freeze({
    endpoint: "https://api.deepseek.com/chat/completions",
    model: "deepseek-v4-pro",
  }),
});

function requireTuple({ provider, productionEndpoint, expectedModel }) {
  const tuple = TUPLES[provider];
  if (!tuple || tuple.endpoint !== productionEndpoint || tuple.model !== expectedModel) {
    throw new TypeError("provider fixture tuple differs from the frozen endpoint/model");
  }
  return tuple;
}

function requireLoopbackEndpoint(value) {
  const url = new URL(value);
  if (url.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)) {
    throw new TypeError("fixture HTTP endpoint must be loopback-only");
  }
  return url.href;
}

export function buildFixtureDispatchPermitV5R2({ provider, productionEndpoint, expectedModel }) {
  requireTuple({ provider, productionEndpoint, expectedModel });
  const body = {
    schemaVersion: "ProviderDispatchPermitV1",
    transportKind: FIXTURE_KIND,
    provider,
    productionEndpoint,
    expectedModel,
    dispatchAllowed: true,
    credentialReadAllowed: true,
    providerCallAllowed: false,
    providerEventCount: 0,
    authorizationHash: null,
  };
  return Object.freeze({ ...body, permitHash: jcsHash(body) });
}

function validateFixturePermit(permit, expected) {
  if (permit?.schemaVersion !== "ProviderDispatchPermitV1"
    || permit?.transportKind !== FIXTURE_KIND
    || permit?.provider !== expected.provider
    || permit?.productionEndpoint !== expected.productionEndpoint
    || permit?.expectedModel !== expected.expectedModel
    || permit?.dispatchAllowed !== true
    || permit?.credentialReadAllowed !== true
    || permit?.providerCallAllowed !== false
    || permit?.providerEventCount !== 0
    || permit?.authorizationHash !== null) {
    throw new Error("fixture dispatch permit is missing, blocked, or tuple-drifted");
  }
  const body = structuredClone(permit);
  delete body.permitHash;
  if (permit.permitHash !== jcsHash(body)) throw new Error("fixture dispatch permit hash mismatch");
}

function validateLivePermit(permit, expected) {
  if (permit?.schemaVersion !== "ProviderDispatchPermitV1"
    || permit?.transportKind !== LIVE_KIND
    || permit?.provider !== expected.provider
    || permit?.productionEndpoint !== expected.endpoint
    || permit?.expectedModel !== expected.expectedModel
    || permit?.dispatchAllowed !== true
    || permit?.credentialReadAllowed !== true
    || permit?.providerCallAllowed !== true
    || permit?.providerEventCount !== 1
    || typeof permit?.authorizationHash !== "string"
    || !/^[0-9a-f]{64}$/u.test(permit.authorizationHash)) {
    throw new Error("live dispatch permit is missing, blocked, unauthorized, or tuple-drifted");
  }
  const body = structuredClone(permit);
  delete body.permitHash;
  if (permit.permitHash !== jcsHash(body)) throw new Error("live dispatch permit hash mismatch");
}

function classifyHttpStatus(status) {
  if (status === 429) return { transportStatus: "HTTP_429", retryClassification: "HTTP_429" };
  if (status >= 500 && status <= 599) return { transportStatus: "HTTP_500", retryClassification: "HTTP_500" };
  if (status >= 200 && status <= 299) return { transportStatus: "DELIVERED", retryClassification: "NOT_A_RETRY" };
  return { transportStatus: "HTTP_NON_RETRYABLE", retryClassification: "NO_RETRY" };
}

export function createLoopbackFixtureHttpTransportV5R2({
  provider,
  productionEndpoint,
  expectedModel,
  fixtureEndpoint,
  timeoutMs,
  credentialSource,
  fetchImpl = globalThis.fetch,
}) {
  requireTuple({ provider, productionEndpoint, expectedModel });
  const target = requireLoopbackEndpoint(fixtureEndpoint);
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1) throw new TypeError("fixture timeout must be a positive integer");
  if (typeof credentialSource?.readBearerToken !== "function") throw new TypeError("fixture credential source is missing");
  if (typeof fetchImpl !== "function") throw new TypeError("fixture fetch implementation is missing");

  return Object.freeze({
    kind: FIXTURE_KIND,
    async send({ permit, wireRequest }) {
      validateFixturePermit(permit, { provider, productionEndpoint, expectedModel });
      const token = await credentialSource.readBearerToken();
      if (typeof token !== "string" || token.length < 1) throw new Error("fixture bearer token is missing");
      const requestBodyBytes = canonicalJson(wireRequest);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      let response;
      try {
        response = await fetchImpl(target, {
          method: "POST",
          redirect: "error",
          headers: {
            authorization: `Bearer ${token}`,
            "content-type": "application/json",
          },
          body: requestBodyBytes,
          signal: controller.signal,
        });
      } catch (error) {
        const timedOut = error?.name === "AbortError";
        return Object.freeze({
          schemaVersion: "FixtureHttpDispatchResultV1",
          transportKind: FIXTURE_KIND,
          provider,
          expectedModel,
          requestedEndpoint: productionEndpoint,
          fixtureEndpoint: target,
          providerEventCount: 0,
          httpRequestCount: 1,
          transportStatus: timedOut ? "TIMEOUT" : "TRANSIENT_NETWORK_FAILURE",
          retryClassification: timedOut ? "TIMEOUT" : "TRANSIENT_NETWORK_FAILURE",
          httpStatus: null,
          providerRequestId: null,
          requestBodyHash: jcsHash(wireRequest),
          rawResponseBody: null,
        });
      } finally {
        clearTimeout(timeout);
      }
      const rawResponseBody = await response.text();
      const status = classifyHttpStatus(response.status);
      return Object.freeze({
        schemaVersion: "FixtureHttpDispatchResultV1",
        transportKind: FIXTURE_KIND,
        provider,
        expectedModel,
        requestedEndpoint: productionEndpoint,
        fixtureEndpoint: target,
        providerEventCount: 0,
        httpRequestCount: 1,
        ...status,
        httpStatus: response.status,
        providerRequestId: response.headers.get("x-request-id"),
        requestBodyHash: jcsHash(wireRequest),
        rawResponseBody,
      });
    },
  });
}

export function createLiveProviderHttpTransportV5R2({
  provider,
  endpoint,
  expectedModel,
  timeoutMs,
  credentialSource,
  fetchImpl = globalThis.fetch,
}) {
  requireTuple({ provider, productionEndpoint: endpoint, expectedModel });
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1) throw new TypeError("live timeout must be a positive integer");
  if (typeof credentialSource?.readBearerToken !== "function") throw new TypeError("live credential source is missing");
  if (typeof fetchImpl !== "function") throw new TypeError("live fetch implementation is missing");
  return Object.freeze({
    kind: LIVE_KIND,
    async send({ permit, wireRequest }) {
      validateLivePermit(permit, { provider, endpoint, expectedModel });
      const token = await credentialSource.readBearerToken();
      if (typeof token !== "string" || token.length < 1) throw new Error("live bearer token is missing");
      const requestBodyBytes = canonicalJson(wireRequest);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      let response;
      try {
        response = await fetchImpl(endpoint, {
          method: "POST",
          redirect: "error",
          headers: {
            authorization: `Bearer ${token}`,
            "content-type": "application/json",
          },
          body: requestBodyBytes,
          signal: controller.signal,
        });
      } catch (error) {
        const timedOut = error?.name === "AbortError";
        return Object.freeze({
          schemaVersion: "LiveProviderHttpDispatchResultV1",
          transportKind: LIVE_KIND,
          provider,
          expectedModel,
          requestedEndpoint: endpoint,
          observedEndpoint: null,
          providerEventCount: 1,
          httpRequestCount: 1,
          transportStatus: timedOut ? "TIMEOUT" : "TRANSIENT_NETWORK_FAILURE",
          retryClassification: timedOut ? "TIMEOUT" : "TRANSIENT_NETWORK_FAILURE",
          httpStatus: null,
          providerRequestId: null,
          requestBodyHash: jcsHash(wireRequest),
          rawResponseBody: null,
        });
      } finally {
        clearTimeout(timeout);
      }
      const observedEndpoint = response.url || endpoint;
      if (response.redirected === true || observedEndpoint !== endpoint) {
        return Object.freeze({
          schemaVersion: "LiveProviderHttpDispatchResultV1",
          transportKind: LIVE_KIND,
          provider,
          expectedModel,
          requestedEndpoint: endpoint,
          observedEndpoint: null,
          providerEventCount: 1,
          httpRequestCount: 1,
          transportStatus: "CONNECTION_LOST_AFTER_DISPATCH",
          retryClassification: "CONNECTION_LOST_AFTER_DISPATCH",
          integrityFailure: "PROVIDER_ORIGIN_DRIFT",
          driftedEndpointHash: jcsHash(observedEndpoint),
          httpStatus: response.status,
          providerRequestId: response.headers.get("x-request-id"),
          requestBodyHash: jcsHash(wireRequest),
          rawResponseBody: null,
        });
      }
      const rawResponseBody = await response.text();
      const status = classifyHttpStatus(response.status);
      return Object.freeze({
        schemaVersion: "LiveProviderHttpDispatchResultV1",
        transportKind: LIVE_KIND,
        provider,
        expectedModel,
        requestedEndpoint: endpoint,
        observedEndpoint,
        providerEventCount: 1,
        httpRequestCount: 1,
        ...status,
        httpStatus: response.status,
        providerRequestId: response.headers.get("x-request-id"),
        requestBodyHash: jcsHash(wireRequest),
        rawResponseBody,
      });
    },
  });
}

export const LIVE_PROVIDER_HTTP_V5_R2_CONSTANTS = Object.freeze({
  fixtureTransportKind: FIXTURE_KIND,
  liveTransportKind: LIVE_KIND,
  tuples: TUPLES,
});
