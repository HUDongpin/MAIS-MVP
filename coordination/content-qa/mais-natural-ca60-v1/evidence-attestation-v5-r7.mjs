import CAPTURE_SCHEMA from "./schemas/ProviderEvidenceCaptureReceiptV2.schema.json" with { type: "json" };
import PROBE_SCHEMA from "./schemas/ProviderRouteProbeAttemptReceiptV2.schema.json" with { type: "json" };
import ATTESTATION_SCHEMA from "./schemas/OwnerEvidenceAttestationReceiptV1.schema.json" with { type: "json" };
import ROUTE_SCHEMA from "./schemas/AuthenticatedRouteEvidenceReceiptV3.schema.json" with { type: "json" };

import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  buildAuthenticatedRouteEvidenceV5R5,
  buildProviderCostPreviewV5R5,
  validateAuthenticatedRouteEvidenceV5R5,
} from "./route-authorization-v5-r5.mjs";
import {
  assertClosedSelfHashedAgainstV5R5,
  validateClosedSelfHashedAgainstV5R5,
} from "./schema-contract-v5-r5.mjs";

const HASH = /^[0-9a-f]{64}$/u;
const SOURCE_KINDS = Object.freeze([
  "ACCOUNT_PROJECT_IDENTITY",
  "DIRECT_BILLING_ROUTE",
  "DATA_REGION",
  "PRICE",
  "ROUTE_PROBE_RESPONSE",
]);
const CAPTURE_MODE = Object.freeze({
  ACCOUNT_PROJECT_IDENTITY: "AUTHENTICATED_PROVIDER_CONSOLE_EXPORT",
  DIRECT_BILLING_ROUTE: "AUTHENTICATED_PROVIDER_BILLING_EXPORT",
  DATA_REGION: "AUTHENTICATED_PROVIDER_CONSOLE_EXPORT",
  PRICE: "OFFICIAL_RATE_CARD_SNAPSHOT",
  ROUTE_PROBE_RESPONSE: "GUARDED_ZERO_NATURAL_CONTENT_PROBE",
});

function requireCondition(condition, message) {
  if (!condition) throw new TypeError(message);
}

function exactIso(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString() === value;
}

function expectedTuple(provider) {
  if (provider === "OPENAI_DIRECT") return {
    model: "gpt-5.6-luna",
    endpoint: "https://us.api.openai.com/v1/responses",
  };
  if (provider === "DEEPSEEK_DIRECT") return {
    model: "deepseek-v4-pro",
    endpoint: "https://api.deepseek.com/chat/completions",
  };
  throw new TypeError("route evidence provider is invalid");
}

function ordered(values, key) {
  return [...values].sort((left, right) => SOURCE_KINDS.indexOf(left[key]) - SOURCE_KINDS.indexOf(right[key]));
}

function buildCaptureReceipt({ activeRunnerRegistrationHash, provider, source, capture }) {
  requireCondition(HASH.test(activeRunnerRegistrationHash ?? "") && SOURCE_KINDS.includes(source.evidenceKind),
    "capture registration or evidence kind is invalid");
  requireCondition(capture?.acquisitionMode === CAPTURE_MODE[source.evidenceKind]
    && typeof capture.sourceHostname === "string" && capture.sourceHostname.length > 0
    && capture.authenticatedSubjectHash === JSON.parse(source.sourceBytes).subjectIdentityHash
    && exactIso(capture.capturedAt) && capture.capturedAt === source.capturedAt,
  "capture mode, origin, subject, or chronology is invalid");
  const receipt = sealV5R3Artifact({
    schemaVersion: "ProviderEvidenceCaptureReceiptV2",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash,
    provider,
    evidenceKind: source.evidenceKind,
    sourceArtifactHash: source.selfHash,
    acquisitionMode: capture.acquisitionMode,
    sourceHostname: capture.sourceHostname,
    authenticatedSubjectHash: capture.authenticatedSubjectHash,
    protectedRawBytesHash: source.sourceBytesHash,
    naturalQuestionContentCount: 0,
    credentialValueRecorded: false,
    capturedAt: capture.capturedAt,
  });
  assertClosedSelfHashedAgainstV5R5(receipt, CAPTURE_SCHEMA, receipt.schemaVersion);
  return receipt;
}

function buildProbeReceipt({ activeRunnerRegistrationHash, provider, routeSource, captureReceipt, probe }) {
  const tuple = expectedTuple(provider);
  const claims = JSON.parse(routeSource.sourceBytes);
  requireCondition(captureReceipt.evidenceKind === "ROUTE_PROBE_RESPONSE"
    && captureReceipt.acquisitionMode === "GUARDED_ZERO_NATURAL_CONTENT_PROBE"
    && probe?.authorizationHash && HASH.test(probe.authorizationHash)
    && probe.rawResponseArtifactHash && HASH.test(probe.rawResponseArtifactHash)
    && probe.rawResponseBindingReceiptHash && HASH.test(probe.rawResponseBindingReceiptHash)
    && probe.requestBodyHash && HASH.test(probe.requestBodyHash)
    && probe.responseBodyHash === routeSource.sourceBytesHash
    && claims.providerRequestId === probe.providerRequestId
    && exactIso(probe.startedAt) && exactIso(probe.finishedAt)
    && Date.parse(probe.startedAt) < Date.parse(probe.finishedAt),
  "guarded route-probe custody or chronology is invalid");
  const receipt = sealV5R3Artifact({
    schemaVersion: "ProviderRouteProbeAttemptReceiptV2",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash,
    authorizationHash: probe.authorizationHash,
    provider,
    requestedModel: tuple.model,
    observedModel: claims.model,
    requestedEndpoint: tuple.endpoint,
    observedEndpoint: claims.endpoint,
    projectResidency: claims.projectResidency,
    dataRegion: claims.dataRegion,
    requestBodyClass: "ROUTE_PROBE_NO_NATURAL_CONTENT_V2",
    requestBodyHash: probe.requestBodyHash,
    responseBodyHash: routeSource.sourceBytesHash,
    rawResponseArtifactHash: probe.rawResponseArtifactHash,
    rawResponseBindingReceiptHash: probe.rawResponseBindingReceiptHash,
    providerRequestId: probe.providerRequestId,
    containsNaturalQuestionText: false,
    providerEventCount: 1,
    httpRequestCount: 1,
    credentialReadCount: 1,
    startedAt: probe.startedAt,
    finishedAt: probe.finishedAt,
    httpStatus: claims.httpStatus,
    attemptStatus: claims.attemptStatus,
  });
  assertClosedSelfHashedAgainstV5R5(receipt, PROBE_SCHEMA, receipt.schemaVersion);
  return receipt;
}

function buildOwnerAttestation({ activeRunnerRegistrationHash, provider, compatibility, captureReceipts,
  probeReceipt, authenticatedSubjectHash, attestedBy, attestedAt }) {
  requireCondition(typeof attestedBy === "string" && attestedBy.length > 0 && exactIso(attestedAt)
    && Date.parse(attestedAt) > Date.parse(probeReceipt.finishedAt),
  "owner evidence attestation identity or chronology is invalid");
  const receipt = sealV5R3Artifact({
    schemaVersion: "OwnerEvidenceAttestationReceiptV1",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash,
    provider,
    sourceSetHash: compatibility.sourceSetHash,
    captureSetHash: sha256V5R3(canonicalJsonV5R3(captureReceipts.map(({ selfHash }) => selfHash))),
    routeProbeAttemptReceiptHash: probeReceipt.selfHash,
    authenticatedSubjectHash,
    attestedBy,
    attestationScope: "EXACT_PROTECTED_RAW_SOURCES_CAPTURE_RECEIPTS_AND_ZERO_CONTENT_PROBE_ONLY",
    attestedAt,
  });
  assertClosedSelfHashedAgainstV5R5(receipt, ATTESTATION_SCHEMA, receipt.schemaVersion);
  return receipt;
}

function assembleRouteEvidence({ activeRunnerRegistrationHash, provider, compatibility, captureReceipts,
  probeReceipt, ownerAttestation, validatedAt }) {
  requireCondition(validateAuthenticatedRouteEvidenceV5R5({ receipt: compatibility }).length === 0,
    "compatibility route evidence fails protected-source reconstruction");
  requireCondition(exactIso(validatedAt) && Date.parse(validatedAt) > Date.parse(ownerAttestation.attestedAt),
    "route evidence validation must postdate owner attestation");
  const orderedCaptures = ordered(captureReceipts, "evidenceKind");
  const captureSetHash = sha256V5R3(canonicalJsonV5R3(orderedCaptures.map(({ selfHash }) => selfHash)));
  requireCondition(ownerAttestation.sourceSetHash === compatibility.sourceSetHash
    && ownerAttestation.captureSetHash === captureSetHash
    && ownerAttestation.routeProbeAttemptReceiptHash === probeReceipt.selfHash
    && ownerAttestation.authenticatedSubjectHash === compatibility.subjectIdentityHash
    && probeReceipt.activeRunnerRegistrationHash === activeRunnerRegistrationHash
    && probeReceipt.provider === provider
    && probeReceipt.projectResidency === compatibility.projectResidency
    && probeReceipt.dataRegion === compatibility.dataRegion,
  "route evidence referenced capture, owner, probe, subject, or residency binding is invalid");
  const receipt = sealV5R3Artifact({
    schemaVersion: "AuthenticatedRouteEvidenceReceiptV3",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash,
    provider,
    model: compatibility.model,
    endpoint: compatibility.endpoint,
    projectResidency: compatibility.projectResidency,
    dataRegion: compatibility.dataRegion,
    subjectIdentityHash: compatibility.subjectIdentityHash,
    directBillingConfirmed: compatibility.directBillingConfirmed,
    routeProbeConfirmed: compatibility.routeProbeConfirmed,
    routeProbeContainsNaturalQuestionText: compatibility.routeProbeContainsNaturalQuestionText,
    priceCurrency: compatibility.priceCurrency,
    inputUsdPerMillionTokens: compatibility.inputUsdPerMillionTokens,
    outputUsdPerMillionTokens: compatibility.outputUsdPerMillionTokens,
    compatibilityRouteEvidenceReceiptHash: compatibility.selfHash,
    compatibilityRouteEvidenceReceipt: structuredClone(compatibility),
    sourceSetHash: compatibility.sourceSetHash,
    captureSetHash,
    captureReceipts: orderedCaptures.map((value) => structuredClone(value)),
    ownerEvidenceAttestationReceiptHash: ownerAttestation.selfHash,
    ownerEvidenceAttestationReceipt: structuredClone(ownerAttestation),
    routeProbeAttemptReceiptHash: probeReceipt.selfHash,
    routeProbeAttemptReceipt: structuredClone(probeReceipt),
    claimsDerivedFromProtectedRawBytes: true,
    referencedEvidenceRebuilt: true,
    evidenceDisposition: "OWNER_ATTESTED_PARSED_RAW_SOURCES_PLUS_GUARDED_ZERO_CONTENT_PROBE",
    validatedAt,
  });
  assertClosedSelfHashedAgainstV5R5(receipt, ROUTE_SCHEMA, receipt.schemaVersion);
  return receipt;
}

export function buildAttestedRouteEvidenceV5R7(input) {
  requireCondition(HASH.test(input?.activeRunnerRegistrationHash ?? "")
    && Array.isArray(input.sourceInputs) && input.sourceInputs.length === 5
    && Array.isArray(input.captureInputs) && input.captureInputs.length === 5,
  "R7 attested route evidence requires one complete source and capture set");
  const compatibility = buildAuthenticatedRouteEvidenceV5R5({
    activeRunnerRegistrationHash: input.activeRunnerRegistrationHash,
    provider: input.provider,
    sources: input.sourceInputs,
    validatedAt: input.compatibilityValidatedAt,
  });
  const capturesByKind = new Map(input.captureInputs.map((capture) => [capture.evidenceKind, capture]));
  requireCondition(capturesByKind.size === 5, "route evidence capture kinds are duplicated");
  const captureReceipts = ordered(compatibility.sources, "evidenceKind").map((source) => buildCaptureReceipt({
    activeRunnerRegistrationHash: input.activeRunnerRegistrationHash,
    provider: input.provider,
    source,
    capture: capturesByKind.get(source.evidenceKind),
  }));
  const routeSource = compatibility.sources.find(({ evidenceKind }) => evidenceKind === "ROUTE_PROBE_RESPONSE");
  const routeCapture = captureReceipts.find(({ evidenceKind }) => evidenceKind === "ROUTE_PROBE_RESPONSE");
  const probeReceipt = buildProbeReceipt({
    activeRunnerRegistrationHash: input.activeRunnerRegistrationHash,
    provider: input.provider,
    routeSource,
    captureReceipt: routeCapture,
    probe: input.probe,
  });
  const ownerAttestation = buildOwnerAttestation({
    activeRunnerRegistrationHash: input.activeRunnerRegistrationHash,
    provider: input.provider,
    compatibility,
    captureReceipts,
    probeReceipt,
    authenticatedSubjectHash: compatibility.subjectIdentityHash,
    attestedBy: input.attestedBy,
    attestedAt: input.attestedAt,
  });
  return assembleRouteEvidence({
    activeRunnerRegistrationHash: input.activeRunnerRegistrationHash,
    provider: input.provider,
    compatibility,
    captureReceipts,
    probeReceipt,
    ownerAttestation,
    validatedAt: input.validatedAt,
  });
}

export function validateAttestedRouteEvidenceV5R7(receipt) {
  const errors = [
    ...validateClosedSelfHashedAgainstV5R5(receipt, ROUTE_SCHEMA),
    ...validateClosedSelfHashedAgainstV5R5(receipt?.routeProbeAttemptReceipt, PROBE_SCHEMA),
    ...validateClosedSelfHashedAgainstV5R5(receipt?.ownerEvidenceAttestationReceipt, ATTESTATION_SCHEMA),
  ];
  for (const capture of receipt?.captureReceipts ?? []) {
    errors.push(...validateClosedSelfHashedAgainstV5R5(capture, CAPTURE_SCHEMA));
  }
  try {
    const compatibilityErrors = validateAuthenticatedRouteEvidenceV5R5({
      receipt: receipt.compatibilityRouteEvidenceReceipt,
    });
    requireCondition(compatibilityErrors.length === 0, compatibilityErrors.join("; "));
    const sourceByKind = new Map(receipt.compatibilityRouteEvidenceReceipt.sources
      .map((source) => [source.evidenceKind, source]));
    for (const capture of receipt.captureReceipts) {
      const source = sourceByKind.get(capture.evidenceKind);
      requireCondition(source && capture.sourceArtifactHash === source.selfHash
        && capture.protectedRawBytesHash === source.sourceBytesHash
        && capture.authenticatedSubjectHash === JSON.parse(source.sourceBytes).subjectIdentityHash,
      "capture receipt differs from its exact protected raw source");
    }
    const rebuilt = assembleRouteEvidence({
      activeRunnerRegistrationHash: receipt.activeRunnerRegistrationHash,
      provider: receipt.provider,
      compatibility: receipt.compatibilityRouteEvidenceReceipt,
      captureReceipts: receipt.captureReceipts,
      probeReceipt: receipt.routeProbeAttemptReceipt,
      ownerAttestation: receipt.ownerEvidenceAttestationReceipt,
      validatedAt: receipt.validatedAt,
    });
    if (canonicalJsonV5R3(rebuilt) !== canonicalJsonV5R3(receipt)) {
      errors.push("R7 attested route evidence differs from exact referenced-evidence reconstruction");
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return Object.freeze([...new Set(errors)]);
}

export function buildProviderCostPreviewV5R7({ routeEvidence, ...input }) {
  const routeErrors = validateAttestedRouteEvidenceV5R7(routeEvidence);
  requireCondition(routeErrors.length === 0, routeErrors.join("; "));
  requireCondition(input.activeRunnerRegistrationHash === routeEvidence.activeRunnerRegistrationHash
    && input.provider === routeEvidence.provider,
  "cost preview route, provider, or active runner binding is invalid");
  return buildProviderCostPreviewV5R5({
    ...input,
    inputUsdPerMillionTokens: routeEvidence.inputUsdPerMillionTokens,
    outputUsdPerMillionTokens: routeEvidence.outputUsdPerMillionTokens,
    priceEvidenceHash: routeEvidence.selfHash,
  });
}

export function validateProviderCostPreviewV5R7({ routeEvidence, preview }) {
  const errors = [...validateAttestedRouteEvidenceV5R7(routeEvidence)];
  try {
    const rebuilt = buildProviderCostPreviewV5R7({
      routeEvidence,
      activeRunnerRegistrationHash: preview?.activeRunnerRegistrationHash,
      provider: preview?.provider,
      maximumSuccessfulCalls: preview?.maximumSuccessfulCalls,
      maximumAttempts: preview?.maximumAttempts,
      maximumInputTokens: preview?.maximumInputTokens,
      maximumOutputTokens: preview?.maximumOutputTokens,
      maximumTokens: preview?.maximumTokens,
      maximumEstimatedUsd: preview?.maximumEstimatedUsd,
      computedAt: preview?.computedAt,
    });
    if (canonicalJsonV5R3(rebuilt) !== canonicalJsonV5R3(preview)) {
      errors.push("R7 cost preview differs from route-derived full-envelope recomputation");
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return Object.freeze([...new Set(errors)]);
}

export const EVIDENCE_ATTESTATION_V5_R7_CONSTANTS = Object.freeze({
  sourceKinds: SOURCE_KINDS,
  captureModeByKind: CAPTURE_MODE,
  claimBoundary: "OWNER_ATTESTED_PARSED_RAW_SOURCES_PLUS_GUARDED_ZERO_CONTENT_PROBE",
});
