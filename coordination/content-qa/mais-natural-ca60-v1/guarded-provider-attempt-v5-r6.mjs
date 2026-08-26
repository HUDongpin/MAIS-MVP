import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  assertClosedSelfHashedArtifactV5R4,
} from "./schema-contract-v5-r4.mjs";
import {
  assertClosedSelfHashedArtifactV5R6,
  validateClosedSelfHashedArtifactV5R6,
} from "./schema-contract-v5-r6.mjs";
import {
  validateProviderActivationV5R6,
} from "./activation-guard-v5-r6.mjs";
import {
  exactProviderWireBytesV5R6,
  validateAndRebuildProviderRequestArtifactV5R6,
} from "./provider-request-v5-r6.mjs";
import {
  planOpenAIReferenceResumeV5R4,
} from "./execution-state-v5-r4.mjs";
import {
  buildDeepSeekPlanReceiptKernelV5R5,
} from "./state-bound-dispatch-v5-r5.mjs";
import {
  buildRawResponseBindingReceiptV5R6,
  independentlyReparseRawResponseV5R6,
} from "./raw-response-custody-v5-r6.mjs";

const RESPONSE_HEADER_ALLOWLIST = Object.freeze(["content-type", "date", "openai-processing-ms", "x-request-id"]);
const REQUEST_ID_HEADERS = Object.freeze(["x-request-id", "request-id", "cf-ray"]);
const PROVIDER_REQUEST_TIMEOUT_MS = 120_000;
const MAX_PROVIDER_RESPONSE_BYTES = 16 * 1024 * 1024;

function requireCondition(condition, message) {
  if (!condition) throw new TypeError(message);
}

function nowIso(clock) {
  const value = clock();
  const date = value instanceof Date ? value : new Date(value);
  requireCondition(Number.isFinite(date.getTime()), "transport clock returned an invalid timestamp");
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
  requireCondition([inputTokens, outputTokens].every((value) => Number.isSafeInteger(value) && value >= 0),
    "provider usage is invalid");
  return Number((((inputTokens * priceSnapshot.inputUsdPerMillionTokens)
    + (outputTokens * priceSnapshot.outputUsdPerMillionTokens)) / 1_000_000).toFixed(12));
}

function providerSubjectIdentityHash(subjectIdentity) {
  requireCondition(typeof subjectIdentity === "string" && subjectIdentity.length > 0,
    "provider subject identity is unavailable");
  return sha256V5R3(subjectIdentity);
}

function validatedCredentialBundle(raw, authorization) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const expectedKeys = authorization.provider === "OPENAI_DIRECT"
    ? ["apiKey", "openAIProjectId", "subjectIdentity"].sort()
    : ["apiKey", "subjectIdentity"].sort();
  if (canonicalJsonV5R3(Object.keys(raw).sort()) !== canonicalJsonV5R3(expectedKeys)
    || typeof raw.apiKey !== "string" || raw.apiKey.length < 1
    || typeof raw.subjectIdentity !== "string" || raw.subjectIdentity.length < 1
    || providerSubjectIdentityHash(raw.subjectIdentity) !== authorization.projectIdentityHash) return null;
  if (authorization.provider === "OPENAI_DIRECT"
    && (typeof raw.openAIProjectId !== "string" || raw.openAIProjectId !== raw.subjectIdentity)) return null;
  return raw;
}

function compatibilityPlan(input) {
  if (input.authorization.provider === "OPENAI_DIRECT") {
    return planOpenAIReferenceResumeV5R4({
      registration: input.registration,
      authorization: input.authorization.compatibilityAuthorization,
      inventory: input.inventory,
      ledgerEntries: input.ledgerEntries ?? [],
      generatedAt: input.at,
    });
  }
  return buildDeepSeekPlanReceiptKernelV5R5({
    ...input,
    registration: input.registration,
    authorization: input.authorization.compatibilityAuthorization,
    provider: "DEEPSEEK_DIRECT",
    ledgerEntries: input.ledgerEntries ?? [],
  });
}

export function buildResolvedExecutionPlanV5R6(input) {
  const activationErrors = validateProviderActivationV5R6(input);
  requireCondition(activationErrors.length === 0, activationErrors.join("; "));
  const priorPlan = compatibilityPlan(input);
  requireCondition(priorPlan?.planStatus === "NEXT_ACTION",
    `compatibility planner is not dispatchable: ${priorPlan?.planStatus ?? "NO_ACTION"}`);
  const attemptOrdinal = priorPlan.failedAttemptsForItemRole + 1;
  const plan = sealV5R3Artifact({
    schemaVersion: "ExecutionPlanReceiptV2",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash: input.activeRegistration.selfHash,
    compatibilityBaseRunnerRegistrationHash: input.registration.selfHash,
    freshRunnerReviewHash: input.freshReview.selfHash,
    providerAuthorizationHash: input.authorization.selfHash,
    authenticatedRouteEvidenceHash: input.authenticatedRouteEvidence.selfHash,
    costPreviewHash: input.costPreview.selfHash,
    sampleExecutionInventoryHash: input.inventory.selfHash,
    provider: input.authorization.provider,
    model: input.authorization.model,
    endpoint: input.authorization.endpoint,
    projectResidency: input.authorization.projectResidency,
    dataRegion: input.authorization.dataRegion,
    mode: input.mode,
    planStatus: "NEXT_ACTION",
    itemHash: priorPlan.itemHash,
    manifestOrdinal: priorPlan.manifestOrdinal,
    role: priorPlan.role,
    failedAttemptsForItemRole: priorPlan.failedAttemptsForItemRole,
    attemptOrdinal,
    ledgerTerminalHash: priorPlan.ledgerTerminalHash,
    c0DecisionHash: priorPlan.c0DecisionHash,
    compatibilityPlanHash: priorPlan.selfHash ?? sha256V5R3(canonicalJsonV5R3(priorPlan)),
    generatedAt: input.at,
  });
  assertClosedSelfHashedArtifactV5R6(plan, "ExecutionPlanReceiptV2");
  return plan;
}

export function buildStateBoundDispatchAuditV5R6(input) {
  const executionPlan = buildResolvedExecutionPlanV5R6(input);
  const attemptId = `V5R6:${input.activeRegistration.selfHash}:${executionPlan.selfHash}:${executionPlan.attemptOrdinal}`;
  const audit = sealV5R3Artifact({
    schemaVersion: "StateBoundDispatchAuditReceiptV2",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash: input.activeRegistration.selfHash,
    compatibilityBaseRunnerRegistrationHash: input.registration.selfHash,
    freshRunnerReviewHash: input.freshReview.selfHash,
    ownerActivationGrantHash: input.ownerActivationGrant.selfHash,
    providerAuthorizationHash: input.authorization.selfHash,
    authenticatedRouteEvidenceHash: input.authenticatedRouteEvidence.selfHash,
    costPreviewHash: input.costPreview.selfHash,
    sampleExecutionInventoryHash: input.inventory.selfHash,
    executionRegistrationHash: input.authorization.provider === "DEEPSEEK_DIRECT"
      ? input.executionRegistration?.selfHash ?? null : null,
    c0ExecutionSetHash: input.mode === "DEEPSEEK_RESUME" ? input.c0ExecutionSet?.selfHash ?? null : null,
    canaryPredicateReceiptHash: input.mode === "DEEPSEEK_CANARY"
      ? input.canaryPredicateReceipt?.selfHash ?? null : null,
    adjudicationTriggerHash: executionPlan.role === "ADJUDICATOR"
      ? input.adjudicationTrigger?.selfHash ?? null : null,
    canaryGateHash: input.mode === "DEEPSEEK_RESUME" ? input.canaryGate?.selfHash ?? null : null,
    executionPlanHash: executionPlan.selfHash,
    executionPlan: structuredClone(executionPlan),
    preReservationLedgerTerminalHash: executionPlan.ledgerTerminalHash,
    itemHash: executionPlan.itemHash,
    role: executionPlan.role,
    attemptOrdinal: executionPlan.attemptOrdinal,
    attemptId,
    issuedAt: input.at,
  });
  assertClosedSelfHashedArtifactV5R6(audit, "StateBoundDispatchAuditReceiptV2");
  return audit;
}

export function validateStateBoundDispatchAuditV5R6({ dispatchAudit, ...input }) {
  const errors = [...validateClosedSelfHashedArtifactV5R6(dispatchAudit, "StateBoundDispatchAuditReceiptV2")];
  try {
    const rebuilt = buildStateBoundDispatchAuditV5R6(input);
    if (canonicalJsonV5R3(rebuilt) !== canonicalJsonV5R3(dispatchAudit)) {
      errors.push("R6 state-bound dispatch audit differs from exact resolved-plan reconstruction");
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return Object.freeze([...new Set(errors)]);
}

export function buildResolvedDispatchPermitV5R6({ input, reservation, dispatchAudit }) {
  const permit = sealV5R3Artifact({
    schemaVersion: "ProviderDispatchPermitV4",
    mode: "LIVE",
    activeRunnerRegistrationHash: input.activeRegistration.selfHash,
    freshRunnerReviewHash: input.freshReview.selfHash,
    authorizationHash: input.authorization.selfHash,
    authenticatedRouteEvidenceHash: input.authenticatedRouteEvidence.selfHash,
    sampleExecutionInventoryHash: input.inventory.selfHash,
    reservationHash: reservation.selfHash,
    requestArtifactHash: input.requestArtifact.selfHash,
    compatibilityRequestArtifactHash: input.requestArtifact.compatibilityRequestArtifactHash,
    dispatchAuditHash: dispatchAudit.selfHash,
    attemptId: dispatchAudit.attemptId,
    provider: input.authorization.provider,
    model: input.authorization.model,
    endpoint: input.authorization.endpoint,
    projectResidency: input.authorization.projectResidency,
    dataRegion: input.authorization.dataRegion,
    projectIdentityHash: input.authorization.projectIdentityHash,
    role: input.requestArtifact.role,
    itemHash: input.requestArtifact.itemHash,
    itemIdPseudonym: input.requestArtifact.itemIdPseudonym,
    wireRequestBodyHash: input.requestArtifact.wireRequestBodyHash,
    wireRequestByteLength: input.requestArtifact.wireRequestByteLength,
    issuedAt: input.at,
  });
  assertClosedSelfHashedArtifactV5R6(permit, "ProviderDispatchPermitV4");
  return permit;
}

function buildCompatibilityDispatchPermitV5R6({ input, reservation, dispatchAudit }) {
  const authorization = input.authorization.compatibilityAuthorization;
  const requestArtifact = input.requestArtifact.compatibilityRequestArtifact;
  const permit = sealV5R3Artifact({
    schemaVersion: "ProviderDispatchPermitV3",
    mode: "LIVE",
    runnerRegistrationHash: authorization.runnerRegistrationHash,
    freshRunnerReviewHash: authorization.freshRunnerReviewHash,
    authorizationHash: authorization.selfHash,
    sampleExecutionInventoryHash: input.inventory.selfHash,
    reservationHash: reservation.selfHash,
    requestArtifactHash: requestArtifact.selfHash,
    attemptId: dispatchAudit.attemptId,
    provider: input.authorization.provider,
    model: input.authorization.model,
    endpoint: input.authorization.endpoint,
    projectIdentityHash: input.authorization.projectIdentityHash,
    role: requestArtifact.role,
    itemHash: requestArtifact.itemHash,
    itemIdPseudonym: requestArtifact.itemIdPseudonym,
    wireRequestBodyHash: requestArtifact.wireRequestBodyHash,
    wireRequestByteLength: requestArtifact.wireRequestByteLength,
    issuedAt: input.at,
  });
  assertClosedSelfHashedArtifactV5R4(permit, "ProviderDispatchPermitV3");
  return permit;
}

function validateResolvedDispatchPermit({ input, reservation, dispatchAudit, permit }) {
  const errors = [...validateClosedSelfHashedArtifactV5R6(permit, "ProviderDispatchPermitV4")];
  try {
    const rebuilt = buildResolvedDispatchPermitV5R6({ input, reservation, dispatchAudit });
    if (canonicalJsonV5R3(rebuilt) !== canonicalJsonV5R3(permit)) {
      errors.push("R6 dispatch permit differs from exact resolved-route reconstruction");
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return Object.freeze([...new Set(errors)]);
}

export function createResolvedExactProviderTransportV5R6({
  fetchImplementation,
  credentialReader,
  clock = () => new Date(),
} = {}) {
  requireCondition(typeof fetchImplementation === "function" && typeof credentialReader === "function",
    "R6 transport requires injected fetch and credential-reader functions");
  return Object.freeze({
    kind: "V5_R6_RESOLVED_STATE_BOUND_EXACT_TRANSPORT",
    async send({ input, reservation, dispatchAudit, permit }) {
      const activationErrors = validateProviderActivationV5R6(input);
      const auditErrors = validateStateBoundDispatchAuditV5R6({ ...input, dispatchAudit });
      const permitErrors = validateResolvedDispatchPermit({ input, reservation, dispatchAudit, permit });
      const requestErrors = validateAndRebuildProviderRequestArtifactV5R6(input);
      const errors = [...activationErrors, ...auditErrors, ...permitErrors, ...requestErrors];
      if (errors.length > 0) throw new Error(`V5-R6 transport rejected before credential read: ${errors.join("; ")}`);
      requireCondition(input.requestArtifact.attemptId === dispatchAudit.attemptId
        && input.requestArtifact.itemHash === dispatchAudit.itemHash
        && input.requestArtifact.role === dispatchAudit.role,
      "resolved request does not bind the exact R6 plan");
      const wireBytes = exactProviderWireBytesV5R6(input.requestArtifact);
      requireCondition(sha256V5R3(wireBytes) === permit.wireRequestBodyHash
        && wireBytes.byteLength === permit.wireRequestByteLength,
      "transport bytes differ from the R6 resolved-route permit");
      const startedAt = nowIso(clock);
      let credentialBundle;
      try {
        credentialBundle = validatedCredentialBundle(await credentialReader({
          provider: input.authorization.provider,
          endpoint: input.authorization.endpoint,
          projectResidency: input.authorization.projectResidency,
          dataRegion: input.authorization.dataRegion,
          expectedSubjectIdentityHash: input.authorization.projectIdentityHash,
          activeRunnerRegistrationHash: input.activeRegistration.selfHash,
          stateBoundDispatchAuditHash: dispatchAudit.selfHash,
        }), input.authorization);
      } catch {
        credentialBundle = null;
      }
      if (!credentialBundle) {
        const finishedAt = nowIso(clock);
        return Object.freeze({
          startedAt,
          finishedAt,
          latencyMs: Date.parse(finishedAt) - Date.parse(startedAt),
          transportStatus: "NOT_DISPATCHED",
          bodyReadStatus: "NOT_AVAILABLE",
          httpStatus: null,
          observedEndpoint: null,
          requestBodyHash: sha256V5R3(wireBytes),
          responseBodyHash: null,
          providerRequestId: null,
          responseHeaders: {},
          rawResponseBody: null,
          providerEventCount: 0,
          httpRequestCount: 0,
          credentialReadCount: 1,
          transportError: "CREDENTIAL_OR_PROJECT_IDENTITY_UNAVAILABLE",
        });
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
        const requestHeaders = { authorization: `Bearer ${credentialBundle.apiKey}`, "content-type": "application/json" };
        if (input.authorization.provider === "OPENAI_DIRECT") {
          requestHeaders["openai-project"] = credentialBundle.openAIProjectId;
        }
        const response = await fetchImplementation(input.authorization.endpoint, {
          method: "POST",
          redirect: "error",
          signal: AbortSignal.timeout(PROVIDER_REQUEST_TIMEOUT_MS),
          headers: requestHeaders,
          body: wireBytes.toString("utf8"),
        });
        httpStatus = response.status;
        observedEndpoint = typeof response.url === "string" && response.url.length > 0
          ? response.url : input.authorization.endpoint;
        requestId = providerRequestId(response.headers);
        responseHeaders = redactedHeaders(response.headers);
        const responseBytes = Buffer.from(await response.arrayBuffer());
        if (responseBytes.byteLength > MAX_PROVIDER_RESPONSE_BYTES) {
          throw new RangeError("provider response exceeds the frozen R6 byte limit");
        }
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
        credentialReadCount: 1,
        transportError,
      });
    },
  });
}

function blocked(errors) {
  return Object.freeze({
    schemaVersion: "GuardedProviderAttemptRunV5R6",
    status: "AUTHORIZATION_BLOCKED",
    dispatchAllowed: false,
    credentialReadCount: 0,
    providerEventCount: 0,
    httpRequestCount: 0,
    naturalQuestionEgressCount: 0,
    dispatchAudit: null,
    reservation: null,
    permit: null,
    compatibilityPermit: null,
    rawResponseArtifactHash: null,
    rawResponseBindingReceipt: null,
    providerEventReceipt: null,
    roleOutput: null,
    completion: null,
    resolvedAttemptReceipt: null,
    errors: Object.freeze([...new Set(errors)]),
  });
}

function compatibilityProviderEvent({ input, reservation, compatibilityPermit, transportResult, parsed, attemptStatus,
  parseStatus, schemaStatus, usageSource, inputTokens, outputTokens, reasoningTokens, totalTokens, estimatedCostUsd }) {
  const receipt = sealV5R3Artifact({
    schemaVersion: "ProviderEventReceiptV4",
    reservationHash: reservation.selfHash,
    authorizationHash: input.authorization.compatibilityAuthorizationHash,
    requestArtifactHash: input.requestArtifact.compatibilityRequestArtifactHash,
    dispatchPermitHash: compatibilityPermit.selfHash,
    dispatchPermit: structuredClone(compatibilityPermit),
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
  assertClosedSelfHashedArtifactV5R4(receipt, "ProviderEventReceiptV4");
  return receipt;
}

function compatibilityRoleOutput({ input, providerEventReceipt, parsed }) {
  const output = sealV5R3Artifact({
    schemaVersion: "ProviderRoleOutputV1",
    designId: "MAIS-NATURAL-CA60-V5",
    runnerRegistrationHash: input.activeRegistration.selfHash,
    sampleExecutionInventoryHash: input.inventory.selfHash,
    authorizationHash: input.authorization.compatibilityAuthorizationHash,
    provider: input.authorization.provider,
    model: input.authorization.model,
    endpoint: input.authorization.endpoint,
    role: input.requestArtifact.role,
    attemptId: input.requestArtifact.attemptId,
    attemptReceiptHash: providerEventReceipt.selfHash,
    requestArtifactHash: input.requestArtifact.compatibilityRequestArtifactHash,
    itemHash: input.requestArtifact.itemHash,
    itemIdPseudonym: input.requestArtifact.itemIdPseudonym,
    clusterId: input.requestArtifact.clusterId,
    rolePromptHash: input.requestArtifact.rolePromptHash,
    roleSchemaHash: input.requestArtifact.roleSchemaHash,
    parsedPayload: structuredClone(parsed.parsedPayload),
    parsedPayloadHash: parsed.parsedPayloadHash ?? sha256V5R3(canonicalJsonV5R3(parsed.parsedPayload)),
    referenceInputCount: 0,
    deepSeekInputCount: 0,
  });
  assertClosedSelfHashedArtifactV5R4(output, "ProviderRoleOutputV1");
  return output;
}

export async function runGuardedProviderAttemptV5R6(input) {
  const errors = [
    ...validateProviderActivationV5R6(input),
    ...validateAndRebuildProviderRequestArtifactV5R6(input),
  ];
  if (input?.transport?.kind !== "V5_R6_RESOLVED_STATE_BOUND_EXACT_TRANSPORT"
    || typeof input.transport.send !== "function") errors.push("registered V5-R6 exact transport is unavailable");
  if (typeof input?.ledger?.reserve !== "function" || typeof input?.ledger?.complete !== "function") {
    errors.push("authoritative compatibility ledger is unavailable");
  }
  if (typeof input?.dispatchAuditStore?.append !== "function") errors.push("append-only R6 dispatch-audit store is unavailable");
  if (typeof input?.rawResponseStore?.persist !== "function" || typeof input?.rawResponseStore?.persistBinding !== "function") {
    errors.push("protected raw-response custody store is unavailable");
  }
  if (typeof input?.attemptReceiptStore?.append !== "function") errors.push("append-only resolved attempt-receipt store is unavailable");
  if (errors.length > 0) return blocked(errors);

  const dispatchAudit = buildStateBoundDispatchAuditV5R6(input);
  if (input.requestArtifact.attemptId !== dispatchAudit.attemptId
    || input.requestArtifact.itemHash !== dispatchAudit.itemHash
    || input.requestArtifact.role !== dispatchAudit.role) {
    return blocked(["resolved request does not bind the exact R6 state-planned attempt ID, item, and role"]);
  }
  const auditPersisted = await input.dispatchAuditStore.append(dispatchAudit);
  if (auditPersisted?.contentHash !== dispatchAudit.selfHash) {
    return blocked(["R6 dispatch audit was not durably persisted before reservation"]);
  }
  const reservation = await input.ledger.reserve({
    requestArtifact: input.requestArtifact.compatibilityRequestArtifact,
  });
  const permit = buildResolvedDispatchPermitV5R6({ input, reservation, dispatchAudit });
  let transportResult;
  try {
    transportResult = await input.transport.send({ input, reservation, dispatchAudit, permit });
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
      credentialReadCount: 0,
      transportError: error instanceof Error ? error.name : "TRANSPORT_ERROR",
    });
  }

  const rawPersisted = await input.rawResponseStore.persist({
    activeRunnerRegistrationHash: input.activeRegistration.selfHash,
    authorizationHash: input.authorization.selfHash,
    requestArtifactHash: input.requestArtifact.selfHash,
    reservationHash: reservation.selfHash,
    dispatchAuditHash: dispatchAudit.selfHash,
    attemptId: input.requestArtifact.attemptId,
    provider: input.authorization.provider,
    role: input.requestArtifact.role,
    itemHash: input.requestArtifact.itemHash,
    transportStatus: transportResult.transportStatus,
    bodyReadStatus: transportResult.bodyReadStatus,
    httpStatus: transportResult.httpStatus,
    rawResponseBody: transportResult.rawResponseBody,
    capturedAt: transportResult.finishedAt,
  });
  requireCondition(rawPersisted?.persistedBeforeCompletion === true,
    "raw provider response was not durably retained before completion");

  let parsed = null;
  let parseStatus = "NOT_PARSED";
  let schemaStatus = "NOT_EVALUATED";
  let attemptStatus = transportResult.transportStatus === "DELIVERED" ? "SCHEMA_FAILURE"
    : transportResult.transportStatus === "NOT_DISPATCHED" ? "CREDENTIAL_UNAVAILABLE" : transportResult.transportStatus;
  if (transportResult.transportStatus === "DELIVERED") {
    try {
      parsed = independentlyReparseRawResponseV5R6({
        rawResponseArtifact: rawPersisted.artifact,
        requestArtifact: input.requestArtifact,
      });
      parseStatus = "PARSED";
      schemaStatus = "VALID";
      attemptStatus = parsed.observedModel === input.authorization.model
        && transportResult.observedEndpoint === input.authorization.endpoint
        && ["completed", "stop"].includes(parsed.finishReason)
        ? "SUCCEEDED" : "PROVIDER_TUPLE_DRIFT";
    } catch {
      parseStatus = "MALFORMED_OR_NONCONFORMING";
      schemaStatus = "INVALID";
      attemptStatus = "SCHEMA_FAILURE";
    }
  }
  const usageSource = parsed?.usage ? "PROVIDER_ENVELOPE" : "UNAVAILABLE_RESERVED_WORST_CASE";
  const inputTokens = usageSource === "PROVIDER_ENVELOPE" ? parsed.usage.inputTokens : null;
  const outputTokens = usageSource === "PROVIDER_ENVELOPE" ? parsed.usage.outputTokens : null;
  const reasoningTokens = usageSource === "PROVIDER_ENVELOPE" ? parsed.usage.reasoningTokens : null;
  const totalTokens = usageSource === "PROVIDER_ENVELOPE" ? parsed.usage.totalTokens : null;
  if (usageSource === "PROVIDER_ENVELOPE" && (inputTokens > reservation.reservedInputTokens
    || outputTokens > reservation.reservedOutputTokens || totalTokens > reservation.reservedTokens)) {
    attemptStatus = "CAP_INTEGRITY_FAILED";
  }
  const estimatedCostUsd = transportResult.providerEventCount === 0 && transportResult.httpRequestCount === 0
    ? 0 : usageSource === "PROVIDER_ENVELOPE"
      ? estimateCost(inputTokens, outputTokens, input.priceSnapshot) : reservation.reservedUsd;
  const compatibilityPermit = buildCompatibilityDispatchPermitV5R6({ input, reservation, dispatchAudit });
  const providerEventReceipt = compatibilityProviderEvent({ input, reservation, compatibilityPermit, transportResult, parsed,
    attemptStatus, parseStatus, schemaStatus, usageSource, inputTokens, outputTokens, reasoningTokens, totalTokens,
    estimatedCostUsd });
  const roleOutput = attemptStatus === "SUCCEEDED"
    ? compatibilityRoleOutput({ input, providerEventReceipt, parsed }) : null;
  const rawResponseBindingReceipt = buildRawResponseBindingReceiptV5R6({
    activeRunnerRegistrationHash: input.activeRegistration.selfHash,
    rawResponseArtifact: rawPersisted.artifact,
    providerEventReceipt,
    roleOutput,
    requestArtifact: input.requestArtifact,
    boundAt: transportResult.finishedAt,
  });
  const bindingPersisted = await input.rawResponseStore.persistBinding(rawResponseBindingReceipt);
  requireCondition(bindingPersisted?.persistedBeforeCompletion === true,
    "raw-response binding was not durably retained before ledger completion");
  const completion = await input.ledger.complete({
    reservationHash: reservation.selfHash,
    providerEventReceipt,
    roleOutput,
  });
  const resolvedAttemptReceipt = sealV5R3Artifact({
    schemaVersion: "ResolvedProviderAttemptReceiptV1",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash: input.activeRegistration.selfHash,
    authorizationHash: input.authorization.selfHash,
    compatibilityAuthorizationHash: input.authorization.compatibilityAuthorizationHash,
    authenticatedRouteEvidenceHash: input.authenticatedRouteEvidence.selfHash,
    requestArtifactHash: input.requestArtifact.selfHash,
    compatibilityRequestArtifactHash: input.requestArtifact.compatibilityRequestArtifactHash,
    dispatchAuditHash: dispatchAudit.selfHash,
    reservationHash: reservation.selfHash,
    dispatchPermitHash: permit.selfHash,
    compatibilityDispatchPermitHash: compatibilityPermit.selfHash,
    rawResponseArtifactHash: rawPersisted.artifact.selfHash,
    rawResponseBindingReceiptHash: rawResponseBindingReceipt.selfHash,
    compatibilityProviderEventReceiptHash: providerEventReceipt.selfHash,
    compatibilityRoleOutputHash: roleOutput?.selfHash ?? null,
    compatibilityCompletionHash: completion.selfHash,
    attemptId: input.requestArtifact.attemptId,
    provider: input.authorization.provider,
    requestedModel: input.authorization.model,
    observedModel: parsed?.observedModel ?? null,
    requestedEndpoint: input.authorization.endpoint,
    observedEndpoint: transportResult.observedEndpoint,
    projectResidency: input.authorization.projectResidency,
    dataRegion: input.authorization.dataRegion,
    role: input.requestArtifact.role,
    itemHash: input.requestArtifact.itemHash,
    itemIdPseudonym: input.requestArtifact.itemIdPseudonym,
    attemptStatus,
    transportStatus: transportResult.transportStatus,
    bodyReadStatus: transportResult.bodyReadStatus,
    parseStatus,
    schemaStatus,
    providerEventCount: transportResult.providerEventCount,
    httpRequestCount: transportResult.httpRequestCount,
    credentialReadCount: transportResult.credentialReadCount,
    inputTokens,
    outputTokens,
    reasoningTokens,
    totalTokens,
    estimatedCostUsd,
    rawResponseRetainedInProtectedStorage: true,
    compatibilitySentinelWasDispatchAuthority: false,
    completedAt: transportResult.finishedAt,
  });
  assertClosedSelfHashedArtifactV5R6(resolvedAttemptReceipt, "ResolvedProviderAttemptReceiptV1");
  const attemptPersisted = await input.attemptReceiptStore.append(resolvedAttemptReceipt);
  requireCondition(attemptPersisted?.contentHash === resolvedAttemptReceipt.selfHash,
    "resolved attempt receipt was not durably appended");
  return Object.freeze({
    schemaVersion: "GuardedProviderAttemptRunV5R6",
    status: attemptStatus,
    dispatchAllowed: true,
    credentialReadCount: transportResult.credentialReadCount,
    providerEventCount: transportResult.providerEventCount,
    httpRequestCount: transportResult.httpRequestCount,
    naturalQuestionEgressCount: transportResult.providerEventCount,
    dispatchAudit,
    reservation,
    permit,
    compatibilityPermit,
    rawResponseArtifactHash: rawPersisted.artifact.selfHash,
    rawResponseBindingReceipt,
    providerEventReceipt,
    roleOutput,
    completion,
    resolvedAttemptReceipt,
    errors: Object.freeze([]),
  });
}

export const GUARDED_PROVIDER_ATTEMPT_V5_R6_CONSTANTS = Object.freeze({
  requestTimeoutMs: PROVIDER_REQUEST_TIMEOUT_MS,
  maximumResponseBytes: MAX_PROVIDER_RESPONSE_BYTES,
  credentialReadBoundary: "ONLY_AFTER_EXACT_R6_REGISTRATION_REVIEW_ROUTE_AUTHORIZATION_PLAN_REQUEST_AND_PERMIT_RECONSTRUCTION",
  compatibilityResidencySentinelIsDispatchAuthority: false,
  rawResponseRequiredBeforeLedgerCompletion: true,
  defaultLiveBindingsInstalled: false,
});
