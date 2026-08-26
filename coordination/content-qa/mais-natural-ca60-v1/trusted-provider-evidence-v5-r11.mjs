import { createPublicKey, verify } from "node:crypto";

import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
  validateSelfHashV5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  validateExternallyAttestedRouteEvidenceV5R6,
} from "./route-evidence-custody-v5-r6.mjs";
import {
  assertClosedSelfHashedArtifactV5R11,
  validateClosedSelfHashedArtifactV5R11,
} from "./schema-contract-v5-r11.mjs";

const REQUIRED_ARTIFACT_KEYS = Object.freeze([
  "requestArtifact",
  "dispatchAuthority",
  "reservation",
  "dispatchPermit",
  "providerEventReceipt",
  "rawResponseArtifact",
  "rawResponseBindingReceipt",
  "attemptCommitIntent",
  "completion",
  "resolvedAttemptReceipt",
]);

function requireCondition(condition, message) {
  if (!condition) throw new TypeError(message);
}

function exactTuple(provider, model, endpoint, projectResidency, dataRegion) {
  if (provider === "OPENAI_DIRECT") {
    return model === "gpt-5.6-luna" && endpoint === "https://us.api.openai.com/v1/responses"
      && projectResidency === "US_STORAGE_PROCESSING" && dataRegion === "US";
  }
  return provider === "DEEPSEEK_DIRECT" && model === "deepseek-v4-pro"
    && endpoint === "https://api.deepseek.com/chat/completions"
    && !/UNKNOWN|UNRESOLVED|PENDING/iu.test(`${projectResidency}:${dataRegion}`);
}

function root(hashes) {
  return sha256V5R3(canonicalJsonV5R3([...hashes].sort()));
}

function atPath(value, path) {
  return path.split(".").reduce((current, key) => current?.[key], value);
}

function oneOfBindings(value, paths, expected) {
  return paths.some((path) => atPath(value, path) === expected);
}

function parseStructuredSource(artifact) {
  requireCondition(typeof artifact?.rawSourceBody === "string",
    `R11 ${artifact?.evidenceKind ?? "UNKNOWN"} source bytes are absent`);
  let parsed;
  try { parsed = JSON.parse(artifact.rawSourceBody); }
  catch { throw new TypeError(`R11 ${artifact.evidenceKind} source bytes are not structured JSON`); }
  requireCondition(parsed && typeof parsed === "object" && !Array.isArray(parsed)
    && parsed.sourceEvidenceFormat === "MAIS_PROVIDER_ROUTE_SOURCE_V1"
    && parsed.evidenceKind === artifact.evidenceKind,
  `R11 ${artifact.evidenceKind} source bytes lack the frozen structured-source contract`);
  return parsed;
}

function reconstructSourceClaims(authenticatedRouteEvidence, routeProbeArtifacts) {
  const rawByKind = new Map(authenticatedRouteEvidence.rawSourceArtifacts
    .map((artifact) => [artifact.evidenceKind, artifact]));
  const account = parseStructuredSource(rawByKind.get("ACCOUNT_PROJECT_IDENTITY"));
  const billing = parseStructuredSource(rawByKind.get("DIRECT_BILLING_ROUTE"));
  const region = parseStructuredSource(rawByKind.get("DATA_REGION"));
  const price = parseStructuredSource(rawByKind.get("PRICE"));
  const tuple = authenticatedRouteEvidence;
  for (const source of [account, billing, region, price]) {
    requireCondition(source.provider === tuple.provider && source.model === tuple.model
      && source.endpoint === tuple.endpoint && source.subjectIdentityHash === tuple.subjectIdentityHash,
    `R11 ${source.evidenceKind} retained bytes differ from the verified route subject/tuple`);
  }
  requireCondition(account.projectResidency === tuple.projectResidency
    && account.dataRegion === tuple.dataRegion
    && billing.directBilling === true
    && billing.billingSubjectIdentityHash === tuple.subjectIdentityHash
    && region.projectResidency === tuple.projectResidency && region.dataRegion === tuple.dataRegion
    && price.currency === "USD"
    && price.inputUsdPerMillionTokens === tuple.inputUsdPerMillionTokens
    && price.outputUsdPerMillionTokens === tuple.outputUsdPerMillionTokens,
  "R11 retained account/billing/region/price bytes do not support the route receipt claims");
  const probe = rawByKind.get("ROUTE_PROBE_RESPONSE");
  requireCondition(probe.rawSourceBody === routeProbeArtifacts.rawResponseArtifact.rawResponseBody,
    "R11 retained route-probe source bytes differ from raw provider-response custody");
  return Object.freeze({ account, billing, region, price, probe });
}

export function buildRouteProbeArtifactSetV5R11(input) {
  const artifacts = Object.fromEntries(REQUIRED_ARTIFACT_KEYS.map((key) => [key, input?.[key]]));
  for (const [key, value] of Object.entries(artifacts)) {
    requireCondition(value && validateSelfHashV5R3(value),
      `R11 route probe ${key} is absent or not exactly self-hashed`);
  }
  const artifactHashes = REQUIRED_ARTIFACT_KEYS.map((key) => artifacts[key].selfHash);
  const set = assertClosedSelfHashedArtifactV5R11(sealV5R3Artifact({
    schemaVersion: "RouteProbeArtifactSetV1",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash: input.activeRunnerRegistrationHash,
    provider: input.provider,
    ...artifacts,
    artifactHashes,
    artifactSetHash: root(artifactHashes),
    naturalQuestionContentCount: 0,
  }), "RouteProbeArtifactSetV1");
  return set;
}

export function validateRouteProbeArtifactSetV5R11(set) {
  const errors = [...validateClosedSelfHashedArtifactV5R11(set, "RouteProbeArtifactSetV1")];
  try {
    const rebuilt = buildRouteProbeArtifactSetV5R11(set);
    requireCondition(canonicalJsonV5R3(rebuilt) === canonicalJsonV5R3(set),
      "R11 route-probe artifact set differs from exact ten-artifact reconstruction");
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return Object.freeze([...new Set(errors)]);
}

export function reconstructRouteProbeCustodyGraphV5R11(input) {
  const artifacts = Object.fromEntries(REQUIRED_ARTIFACT_KEYS.map((key) => [key, input?.[key]]));
  for (const [key, value] of Object.entries(artifacts)) {
    requireCondition(value && validateSelfHashV5R3(value),
      `R11 route probe ${key} is absent or not exactly self-hashed`);
  }
  const request = artifacts.requestArtifact;
  const authority = artifacts.dispatchAuthority;
  const reservation = artifacts.reservation;
  const permit = artifacts.dispatchPermit;
  const event = artifacts.providerEventReceipt;
  const raw = artifacts.rawResponseArtifact;
  const binding = artifacts.rawResponseBindingReceipt;
  const intent = artifacts.attemptCommitIntent;
  const completion = artifacts.completion;
  const resolved = artifacts.resolvedAttemptReceipt;
  requireCondition(request.activeRunnerRegistrationHash === input.activeRunnerRegistrationHash
    && request.provider === input.provider && request.model === input.model
    && request.endpoint === input.endpoint
    && request.naturalQuestionContentCount === 0
    && request.routeProbePurpose === "ZERO_NATURAL_CONTENT_PROVIDER_ROUTE_AUTHENTICITY_PROBE",
  "R11 route probe request is not the exact registered zero-natural-content tuple");
  requireCondition(oneOfBindings(authority, ["requestArtifactHash"], request.selfHash)
    && oneOfBindings(reservation, ["requestArtifactHash"], request.selfHash)
    && oneOfBindings(permit, ["requestArtifactHash"], request.selfHash)
    && oneOfBindings(permit, ["reservationHash"], reservation.selfHash),
  "R11 route probe authority/reservation/permit lineage differs from the request");
  requireCondition(oneOfBindings(event, ["requestArtifactHash"], request.selfHash)
    && oneOfBindings(event, ["reservationHash"], reservation.selfHash)
    && event.provider === input.provider && event.requestedModel === input.model
    && event.requestedEndpoint === input.endpoint
    && event.providerEventCount === 1 && event.httpRequestCount === 1,
  "R11 route probe provider event does not bind the exact request/reservation/tuple");
  requireCondition(raw.requestArtifactHash === request.selfHash
    && raw.reservationHash === reservation.selfHash
    && raw.provider === input.provider
    && raw.rawResponseBodyHash === event.responseBodyHash
    && raw.rawResponseBody !== null
    && raw.rawResponseByteLength === Buffer.byteLength(raw.rawResponseBody, "utf8")
    && raw.rawResponseBodyHash === sha256V5R3(Buffer.from(raw.rawResponseBody, "utf8")),
  "R11 route probe retained raw response bytes or event binding are invalid");
  requireCondition(binding.rawResponseArtifactHash === raw.selfHash
    && binding.rawResponseBodyHash === raw.rawResponseBodyHash
    && binding.providerEventReceiptHash === event.selfHash,
  "R11 route probe raw-response binding receipt differs from retained bytes/event");
  requireCondition(intent.reservationHash === reservation.selfHash
    && intent.requestArtifactHash === request.selfHash
    && intent.preparedCompletionHash === completion.selfHash,
  "R11 route probe durable attempt intent differs from request/reservation/completion");
  requireCondition(completion.reservationHash === reservation.selfHash
    && completion.providerEventReceiptHash === event.selfHash,
  "R11 route probe completion differs from reservation/provider event");
  requireCondition(resolved.activeRunnerRegistrationHash === input.activeRunnerRegistrationHash
    && resolved.requestArtifactHash === request.selfHash
    && resolved.reservationHash === reservation.selfHash
    && resolved.providerEventReceiptHash === event.selfHash
    && resolved.rawResponseArtifactHash === raw.selfHash
    && resolved.rawResponseBindingReceiptHash === binding.selfHash
    && resolved.attemptCommitIntentHash === intent.selfHash
    && oneOfBindings(resolved, ["completionHash", "compatibilityCompletionHash"], completion.selfHash)
    && resolved.provider === input.provider
    && resolved.requestedModel === input.model && resolved.observedModel === input.model
    && resolved.requestedEndpoint === input.endpoint && resolved.observedEndpoint === input.endpoint,
  "R11 route probe resolved receipt does not reconstruct the complete exact tuple graph");
  const hashes = REQUIRED_ARTIFACT_KEYS.map((key) => artifacts[key].selfHash);
  return assertClosedSelfHashedArtifactV5R11(sealV5R3Artifact({
    schemaVersion: "RouteProbeCustodyGraphV1",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash: input.activeRunnerRegistrationHash,
    provider: input.provider,
    model: input.model,
    endpoint: input.endpoint,
    subjectIdentityHash: input.subjectIdentityHash,
    requestArtifactHash: request.selfHash,
    dispatchAuthorityHash: authority.selfHash,
    reservationHash: reservation.selfHash,
    dispatchPermitHash: permit.selfHash,
    providerEventReceiptHash: event.selfHash,
    rawResponseArtifactHash: raw.selfHash,
    rawResponseBindingReceiptHash: binding.selfHash,
    attemptCommitIntentHash: intent.selfHash,
    completionHash: completion.selfHash,
    resolvedAttemptReceiptHash: resolved.selfHash,
    artifactHashes: hashes,
    artifactSetHash: root(hashes),
    providerEventCount: 1,
    httpRequestCount: 1,
    naturalQuestionContentCount: 0,
    graphStatus: "COMPLETE_VALID_ZERO_NATURAL_CONTENT",
    reconstructedAt: input.reconstructedAt,
  }), "RouteProbeCustodyGraphV1");
}

function envelopePayload(input) {
  return Object.freeze({
    schemaVersion: "TrustedProviderEvidenceSignaturePayloadV2",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash: input.activeRunnerRegistrationHash,
    provider: input.provider,
    model: input.model,
    endpoint: input.endpoint,
    projectResidency: input.projectResidency,
    dataRegion: input.dataRegion,
    subjectIdentityHash: input.subjectIdentityHash,
    authenticatedRouteEvidenceReceiptHash: input.authenticatedRouteEvidenceReceiptHash,
    rawSourceArtifactSetHash: input.rawSourceArtifactSetHash,
    captureSetHash: input.captureSetHash,
    priceSnapshotHash: input.priceSnapshotHash,
    zeroContentProbeGraphHash: input.zeroContentProbeGraphHash,
    verifiedEvidenceRootHash: input.verifiedEvidenceRootHash,
    trustAnchorId: input.trustAnchorId,
    capturedAt: input.capturedAt,
    expiresAt: input.expiresAt,
  });
}

export function buildTrustedProviderEvidenceEnvelopeV5R11(input) {
  const payload = envelopePayload(input);
  return assertClosedSelfHashedArtifactV5R11(sealV5R3Artifact({
    ...payload,
    schemaVersion: "TrustedProviderEvidenceEnvelopeV2",
    directBilling: true,
    signatureAlgorithm: "Ed25519",
    signaturePayload: payload,
    signaturePayloadHash: sha256V5R3(canonicalJsonV5R3(payload)),
    signatureBase64: input.signatureBase64,
    sourceBytesRecomputed: true,
    probeGraphReconstructed: true,
    evidenceDisposition: "TRUST_ANCHORED_FULL_SOURCE_BYTES_AND_ZERO_CONTENT_PROBE_GRAPH_RECONSTRUCTED",
  }), "TrustedProviderEvidenceEnvelopeV2");
}

export function validateTrustedProviderEvidenceEnvelopeV5R11({ envelope, activeRegistration,
  authenticatedRouteEvidence, routeProbeArtifacts, priceSnapshot, at }) {
  const errors = [...validateClosedSelfHashedArtifactV5R11(envelope,
    "TrustedProviderEvidenceEnvelopeV2")];
  try {
    requireCondition(activeRegistration?.selfHash === envelope?.activeRunnerRegistrationHash,
      "R11 route envelope does not bind the active registration");
    requireCondition(exactTuple(envelope.provider, envelope.model, envelope.endpoint,
      envelope.projectResidency, envelope.dataRegion), "R11 route evidence tuple is unresolved or different");
    const anchor = (activeRegistration.trustedProviderEvidenceAnchors ?? [])
      .find(({ trustAnchorId }) => trustAnchorId === envelope.trustAnchorId);
    requireCondition(anchor?.algorithm === "Ed25519" && typeof anchor.publicKeySpkiPem === "string",
      "R11 route evidence has no exact pinned Ed25519 trust anchor");
    const routeErrors = validateExternallyAttestedRouteEvidenceV5R6(authenticatedRouteEvidence);
    requireCondition(routeErrors.length === 0, routeErrors.join("; "));
    for (const field of ["activeRunnerRegistrationHash", "provider", "model", "endpoint",
      "projectResidency", "dataRegion", "subjectIdentityHash"]) {
      requireCondition(authenticatedRouteEvidence[field] === envelope[field],
        `R11 authenticated route evidence ${field} differs from the signed envelope`);
    }
    const probeCapture = authenticatedRouteEvidence.captures
      .find(({ evidenceKind }) => evidenceKind === "ROUTE_PROBE_RESPONSE");
    const probeRaw = authenticatedRouteEvidence.rawSourceArtifacts
      .find(({ evidenceKind }) => evidenceKind === "ROUTE_PROBE_RESPONSE");
    const probeGraph = reconstructRouteProbeCustodyGraphV5R11({
      ...routeProbeArtifacts,
      activeRunnerRegistrationHash: envelope.activeRunnerRegistrationHash,
      provider: envelope.provider,
      model: envelope.model,
      endpoint: envelope.endpoint,
      subjectIdentityHash: envelope.subjectIdentityHash,
      reconstructedAt: routeProbeArtifacts?.reconstructedAt ?? envelope.capturedAt,
    });
    requireCondition(probeCapture.guardedProviderEventReceiptHash === probeGraph.providerEventReceiptHash
      && probeCapture.zeroNaturalContentRequestHash === probeGraph.requestArtifactHash
      && probeRaw.rawSourceBytesHash === routeProbeArtifacts.rawResponseArtifact.rawResponseBodyHash,
    "R11 route capture does not bind the reconstructed zero-content request/event/raw bytes");
    reconstructSourceClaims(authenticatedRouteEvidence, routeProbeArtifacts);
    const priceErrors = validateClosedSelfHashedArtifactV5R11(priceSnapshot, "ProviderPriceSnapshotV2");
    requireCondition(priceErrors.length === 0
      && priceSnapshot.selfHash === envelope.priceSnapshotHash
      && priceSnapshot.provider === envelope.provider
      && priceSnapshot.model === envelope.model
      && priceSnapshot.endpoint === envelope.endpoint
      && priceSnapshot.inputUsdPerMillionTokens === authenticatedRouteEvidence.inputUsdPerMillionTokens
      && priceSnapshot.outputUsdPerMillionTokens === authenticatedRouteEvidence.outputUsdPerMillionTokens,
    `R11 signed price snapshot is absent or differs from retained price bytes: ${priceErrors.join("; ")}`);
    const verifiedRoot = root([
      authenticatedRouteEvidence.selfHash,
      authenticatedRouteEvidence.rawSourceArtifactSetHash,
      authenticatedRouteEvidence.captureSetHash,
      probeGraph.selfHash,
      priceSnapshot.selfHash,
    ]);
    requireCondition(envelope.authenticatedRouteEvidenceReceiptHash === authenticatedRouteEvidence.selfHash
      && envelope.rawSourceArtifactSetHash === authenticatedRouteEvidence.rawSourceArtifactSetHash
      && envelope.captureSetHash === authenticatedRouteEvidence.captureSetHash
      && envelope.priceSnapshotHash === priceSnapshot.selfHash
      && envelope.zeroContentProbeGraphHash === probeGraph.selfHash
      && envelope.verifiedEvidenceRootHash === verifiedRoot,
    "R11 signed route envelope does not bind the reconstructed source/probe evidence root");
    const payload = envelopePayload(envelope);
    requireCondition(canonicalJsonV5R3(payload) === canonicalJsonV5R3(envelope.signaturePayload)
      && envelope.signaturePayloadHash === sha256V5R3(canonicalJsonV5R3(payload)),
    "R11 route signature payload differs from reconstructed evidence");
    requireCondition(verify(null, Buffer.from(canonicalJsonV5R3(payload), "utf8"),
      createPublicKey(anchor.publicKeySpkiPem), Buffer.from(envelope.signatureBase64, "base64")),
    "R11 route evidence signature does not verify against the pinned anchor");
    if (at !== undefined) {
      requireCondition(Date.parse(envelope.capturedAt) <= Date.parse(at)
        && Date.parse(at) < Date.parse(envelope.expiresAt),
      "R11 trusted route evidence is not valid at the activation time");
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return Object.freeze([...new Set(errors)]);
}

export const TRUSTED_PROVIDER_EVIDENCE_V5_R11_CONSTANTS = Object.freeze({
  callerAuthoredSummariesAccepted: false,
  retainedSourceBytesRecomputed: true,
  zeroNaturalContentProbeGraphReconstructed: true,
  signatureAlgorithm: "Ed25519",
  currentRegistrationHasRouteTrustAnchor: false,
});
