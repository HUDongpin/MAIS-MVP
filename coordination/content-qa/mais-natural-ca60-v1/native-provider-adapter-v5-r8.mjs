import {
  canonicalJsonV5R3,
  sha256V5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  validateProviderActivationV5R8,
} from "./activation-guard-v5-r8.mjs";
import {
  exactProviderWireBytesV5R6,
  validateAndRebuildProviderRequestArtifactV5R6,
} from "./provider-request-v5-r6.mjs";
import {
  validateClosedSelfHashedArtifactV5R8,
} from "./schema-contract-v5-r8.mjs";

const RESPONSE_HEADER_ALLOWLIST = Object.freeze([
  "content-type", "date", "openai-processing-ms", "x-request-id",
]);
const REQUEST_ID_HEADERS = Object.freeze(["x-request-id", "request-id", "cf-ray"]);
const PROVIDER_REQUEST_TIMEOUT_MS = 120_000;
const MAX_PROVIDER_RESPONSE_BYTES = 16 * 1024 * 1024;

function requireCondition(condition, message) {
  if (!condition) throw new TypeError(message);
}

function nowIso(clock) {
  const value = clock();
  const date = value instanceof Date ? value : new Date(value);
  requireCondition(Number.isFinite(date.getTime()), "R8 adapter clock is invalid");
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

function validateDurableDispatchBoundary(input, boundary) {
  const errors = [];
  const artifacts = [input.requestArtifact, input.dispatchAuthority, input.reservation, input.dispatchPermit];
  const expectedHashes = artifacts.map(({ selfHash }) => selfHash).sort();
  if (!boundary || boundary.kind !== "V5_R8_DURABLE_PRE_DISPATCH_BOUNDARY"
    || boundary.atomicAppendVerified !== true || boundary.fileMode !== "0600"
    || canonicalJsonV5R3([...(boundary.persistedArtifactHashes ?? [])].sort())
      !== canonicalJsonV5R3(expectedHashes)) {
    errors.push("R8 request, authority, reservation, and permit are not all durably committed before credential read");
  }
  errors.push(...validateClosedSelfHashedArtifactV5R8(input.requestArtifact,
    "ProviderRequestArtifactV5"));
  errors.push(...validateClosedSelfHashedArtifactV5R8(input.reservation,
    "ProviderDispatchReservationV2"));
  errors.push(...validateClosedSelfHashedArtifactV5R8(input.dispatchPermit,
    input.dispatchPermit?.schemaVersion ?? "ProviderDispatchPermitV5"));
  if (input.requestArtifact?.activeRunnerRegistrationHash !== input.activeRegistration?.selfHash
    || input.requestArtifact?.authorizationHash !== input.authorization?.selfHash
    || input.reservation?.requestArtifactHash !== input.requestArtifact?.compatibilityRequestArtifactHash
    || input.dispatchPermit?.requestArtifactHash !== input.requestArtifact?.selfHash
    || input.dispatchPermit?.reservationHash !== input.reservation?.selfHash) {
    errors.push("R8 durable pre-dispatch artifact lineage is inconsistent");
  }
  return [...new Set(errors)];
}

export function createNativeProviderAdapterV5R8({ fetchImplementation, credentialReader,
  clock = () => new Date() } = {}) {
  requireCondition(typeof fetchImplementation === "function" && typeof credentialReader === "function",
    "R8 native adapter requires injected fetch and credential-reader functions");
  return Object.freeze({
    kind: "V5_R8_NATIVE_EXACT_PROVIDER_ADAPTER",
    async send(input) {
      const activationErrors = validateProviderActivationV5R8(input);
      const requestErrors = validateAndRebuildProviderRequestArtifactV5R6(input);
      requireCondition(activationErrors.length === 0 && requestErrors.length === 0,
        `R8 adapter rejected before durable dispatch boundary: ${[...activationErrors,
          ...requestErrors].join("; ")}`);
      requireCondition(typeof input.persistPreDispatchBoundary === "function",
        "R8 adapter requires an atomic pre-dispatch custody committer");
      const boundary = await input.persistPreDispatchBoundary({
        requestArtifact: input.requestArtifact,
        dispatchAuthority: input.dispatchAuthority,
        reservation: input.reservation,
        dispatchPermit: input.dispatchPermit,
      });
      const boundaryErrors = validateDurableDispatchBoundary(input, boundary);
      requireCondition(boundaryErrors.length === 0,
        `R8 adapter rejected before credential read: ${boundaryErrors.join("; ")}`);
      const wireBytes = exactProviderWireBytesV5R6(input.requestArtifact);
      requireCondition(sha256V5R3(wireBytes) === input.dispatchPermit.wireRequestBodyHash
        && wireBytes.byteLength === input.dispatchPermit.wireRequestByteLength,
      "R8 exact wire bytes differ from the durable dispatch permit");
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
          credentialReadCount: 1, naturalQuestionEgressCount: 0,
          transportError: "CREDENTIAL_OR_PROJECT_IDENTITY_UNAVAILABLE" });
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
        if (bytes.byteLength > MAX_PROVIDER_RESPONSE_BYTES) throw new RangeError("R8 response exceeds byte cap");
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
        httpRequestCount: 1, credentialReadCount: 1, naturalQuestionEgressCount: 1,
        transportError });
    },
  });
}

export const NATIVE_PROVIDER_ADAPTER_V5_R8_CONSTANTS = Object.freeze({
  requestTimeoutMs: PROVIDER_REQUEST_TIMEOUT_MS,
  maximumResponseBytes: MAX_PROVIDER_RESPONSE_BYTES,
  credentialReadBoundary:
    "ONLY_AFTER_R8_REGISTRATION_GIT_CUSTODY_FRESH_A11_PROCESS_EVIDENCE_SIGNED_ROUTE_AUTHORIZATION_GRANT_COST_CUSTODY_REQUEST_AUTHORITY_RESERVATION_AND_PERMIT",
  defaultLiveBindingsInstalled: false,
});
