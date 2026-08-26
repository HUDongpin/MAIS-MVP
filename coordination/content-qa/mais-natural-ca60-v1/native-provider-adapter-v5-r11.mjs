import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  canonicalJsonV5R3,
  sha256V5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  validateProviderActivationV5R11,
} from "./activation-guard-v5-r11.mjs";
import {
  exactProviderWireBytesV5R6,
  validateAndRebuildProviderRequestArtifactV5R6,
} from "./provider-request-v5-r6.mjs";
import {
  validateClosedSelfHashedArtifactV5R11,
} from "./schema-contract-v5-r11.mjs";
import {
  loadExactTransportActivationCustodyV5R11,
} from "./execution-evidence-v5-r11.mjs";
import {
  atomicWriteProtectedJsonV5R4,
  establishProtectedRootV5R4,
  readProtectedJsonV5R4,
} from "./protected-storage-v5-r4.mjs";

const RESPONSE_HEADER_ALLOWLIST = Object.freeze([
  "content-type", "date", "openai-processing-ms", "x-request-id",
]);
const REQUEST_ID_HEADERS = Object.freeze(["x-request-id", "request-id", "cf-ray"]);
const PROVIDER_REQUEST_TIMEOUT_MS = 120_000;
const MAX_PROVIDER_RESPONSE_BYTES = 16 * 1024 * 1024;
const MODULE_ROOT = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO_ROOT = path.resolve(MODULE_ROOT, "../../..");
const DEFAULT_PROTECTED_ROOT = path.resolve(DEFAULT_REPO_ROOT, ".local/mais-natural-ca60-v1");

function requireCondition(condition, message) {
  if (!condition) throw new TypeError(message);
}

function nowIso(clock) {
  const value = clock();
  const date = value instanceof Date ? value : new Date(value);
  requireCondition(Number.isFinite(date.getTime()), "R11 adapter clock is invalid");
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

async function defaultCredentialReader(request) {
  if (request.provider === "OPENAI_DIRECT") {
    return {
      apiKey: process.env.MAIS_OPENAI_US_API_KEY,
      openAIProjectId: process.env.MAIS_OPENAI_PROJECT_ID,
      subjectIdentity: process.env.MAIS_OPENAI_PROJECT_ID,
    };
  }
  return {
    apiKey: process.env.MAIS_DEEPSEEK_API_KEY,
    subjectIdentity: process.env.MAIS_DEEPSEEK_SUBJECT_ID,
  };
}

async function persistExactPreDispatchBoundaryV5R11(protectedRoot, artifacts) {
  const trustedRoot = await establishProtectedRootV5R4(protectedRoot);
  const hashes = [];
  for (const value of artifacts) {
    const relativePath = path.join("runtime-custody-v5-r11", "pre-dispatch",
      `${value.schemaVersion}-${value.selfHash}.json`);
    try {
      const existing = await readProtectedJsonV5R4({ trustedRoot, relativePath });
      requireCondition(canonicalJsonV5R3(existing) === canonicalJsonV5R3(value),
        "R11 pre-dispatch content-addressed path contains different canonical bytes");
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      await atomicWriteProtectedJsonV5R4({ trustedRoot, relativePath, value });
    }
    const reloaded = await readProtectedJsonV5R4({ trustedRoot, relativePath });
    requireCondition(canonicalJsonV5R3(reloaded) === canonicalJsonV5R3(value),
      "R11 pre-dispatch artifact did not reload from protected storage exactly");
    hashes.push(value.selfHash);
  }
  return Object.freeze({
    kind: "V5_R11_DURABLE_PRE_DISPATCH_BOUNDARY",
    atomicAppendVerified: true,
    fileMode: "0600",
    persistedArtifactHashes: Object.freeze(hashes),
  });
}

function validateDurableDispatchBoundary(input, boundary) {
  const errors = [];
  const artifacts = [input.requestArtifact, input.dispatchAuthority, input.reservation, input.dispatchPermit];
  const expectedHashes = artifacts.map(({ selfHash }) => selfHash).sort();
  if (!boundary || boundary.kind !== "V5_R11_DURABLE_PRE_DISPATCH_BOUNDARY"
    || boundary.atomicAppendVerified !== true || boundary.fileMode !== "0600"
    || canonicalJsonV5R3([...(boundary.persistedArtifactHashes ?? [])].sort())
      !== canonicalJsonV5R3(expectedHashes)) {
    errors.push("R11 request, authority, reservation, and permit are not all durably committed before credential read");
  }
  errors.push(...validateClosedSelfHashedArtifactV5R11(input.requestArtifact,
    "ProviderRequestArtifactV5"));
  errors.push(...validateClosedSelfHashedArtifactV5R11(input.reservation,
    "ProviderDispatchReservationV2"));
  errors.push(...validateClosedSelfHashedArtifactV5R11(input.dispatchPermit,
    input.dispatchPermit?.schemaVersion ?? "ProviderDispatchPermitV5"));
  if (input.requestArtifact?.activeRunnerRegistrationHash !== input.activeRegistration?.selfHash
    || input.requestArtifact?.authorizationHash !== input.authorization?.selfHash
    || input.reservation?.requestArtifactHash !== input.requestArtifact?.compatibilityRequestArtifactHash
    || input.dispatchPermit?.requestArtifactHash !== input.requestArtifact?.selfHash
    || input.dispatchPermit?.reservationHash !== input.reservation?.selfHash) {
    errors.push("R11 durable pre-dispatch artifact lineage is inconsistent");
  }
  return [...new Set(errors)];
}

export function createNativeProviderAdapterV5R11({
  fetchImplementation = globalThis.fetch,
  credentialReader = defaultCredentialReader,
  repoRoot = DEFAULT_REPO_ROOT,
  protectedRoot = DEFAULT_PROTECTED_ROOT,
  clock = () => new Date(),
} = {}) {
  requireCondition(typeof fetchImplementation === "function" && typeof credentialReader === "function",
    "R11 native adapter requires fetch and credential-reader functions");
  requireCondition(path.isAbsolute(repoRoot) && path.isAbsolute(protectedRoot),
    "R11 native adapter requires absolute repository and protected-storage roots");
  return Object.freeze({
    kind: "V5_R11_NATIVE_EXACT_PROVIDER_ADAPTER",
    async send(input) {
      // This is the last side-effecting boundary.  Caller-authored Git-shaped
      // fields are never authority: reload the registration, A07 closeout,
      // signed A11 review, and public reviewer key from immutable Git objects.
      const exact = await loadExactTransportActivationCustodyV5R11({ repoRoot });
      requireCondition(input?.activeRegistration?.selfHash === exact.activeRegistration.selfHash
        && input?.registrationEvidence?.selfHash === exact.registrationEvidence.selfHash,
      "R11 transport caller is not bound to the exact Git-custodied registration");
      const trustedInput = Object.freeze({ ...input, ...exact });
      const activationErrors = validateProviderActivationV5R11(trustedInput);
      const requestErrors = validateAndRebuildProviderRequestArtifactV5R6(trustedInput);
      requireCondition(activationErrors.length === 0 && requestErrors.length === 0,
        `R11 adapter rejected before durable dispatch boundary: ${[...activationErrors,
          ...requestErrors].join("; ")}`);
      const boundary = await persistExactPreDispatchBoundaryV5R11(protectedRoot,
        [trustedInput.requestArtifact, trustedInput.dispatchAuthority,
          trustedInput.reservation, trustedInput.dispatchPermit]);
      const boundaryErrors = validateDurableDispatchBoundary(trustedInput, boundary);
      requireCondition(boundaryErrors.length === 0,
        `R11 adapter rejected before credential read: ${boundaryErrors.join("; ")}`);
      const wireBytes = exactProviderWireBytesV5R6(trustedInput.requestArtifact);
      requireCondition(sha256V5R3(wireBytes) === trustedInput.dispatchPermit.wireRequestBodyHash
        && wireBytes.byteLength === trustedInput.dispatchPermit.wireRequestByteLength,
      "R11 exact wire bytes differ from the durable dispatch permit");
      const startedAt = nowIso(clock);
      let credentialBundle = null;
      try {
        credentialBundle = validatedCredentialBundle(await credentialReader({
          provider: trustedInput.authorization.provider,
          endpoint: trustedInput.authorization.endpoint,
          projectResidency: trustedInput.authorization.projectResidency,
          dataRegion: trustedInput.authorization.dataRegion,
          expectedSubjectIdentityHash: trustedInput.authorization.projectIdentityHash,
          activeRunnerRegistrationHash: trustedInput.activeRegistration.selfHash,
          dispatchAuthorityHash: trustedInput.dispatchAuthority.selfHash,
        }), trustedInput.authorization);
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
        if (trustedInput.authorization.provider === "OPENAI_DIRECT") {
          headers["openai-project"] = credentialBundle.openAIProjectId;
        }
        const response = await fetchImplementation(trustedInput.authorization.endpoint, {
          method: "POST", redirect: "error", signal: AbortSignal.timeout(PROVIDER_REQUEST_TIMEOUT_MS),
          headers, body: wireBytes.toString("utf8"),
        });
        httpStatus = response.status;
        observedEndpoint = typeof response.url === "string" && response.url.length > 0
          ? response.url : trustedInput.authorization.endpoint;
        requestId = providerRequestId(response.headers);
        responseHeaders = redactedHeaders(response.headers);
        const bytes = Buffer.from(await response.arrayBuffer());
        if (bytes.byteLength > MAX_PROVIDER_RESPONSE_BYTES) throw new RangeError("R11 response exceeds byte cap");
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

export const NATIVE_PROVIDER_ADAPTER_V5_R11_CONSTANTS = Object.freeze({
  requestTimeoutMs: PROVIDER_REQUEST_TIMEOUT_MS,
  maximumResponseBytes: MAX_PROVIDER_RESPONSE_BYTES,
  credentialReadBoundary:
    "ONLY_AFTER_R11_EXACT_GIT_REGISTRATION_A07_CLOSEOUT_PINNED_A11_SIGNATURE_FULL_ROUTE_SOURCE_AND_PROBE_RECONSTRUCTION_AUTHORIZATION_GRANT_COST_AND_DURABLE_PRE_DISPATCH_CUSTODY",
  exactGitCustodyReloadedAtFinalTransportBoundary: true,
  callerAuthoredReviewAuthorityAccepted: false,
  defaultNativeBindingsInstalled: true,
});
