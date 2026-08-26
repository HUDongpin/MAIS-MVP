import { createPublicKey, verify } from "node:crypto";

import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
  validateSelfHashV5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  assertClosedSelfHashedArtifactV5R8,
  validateClosedSelfHashedArtifactV5R8,
} from "./schema-contract-v5-r8.mjs";

const HASH = /^[0-9a-f]{64}$/u;
const REQUIRED_KINDS = Object.freeze([
  "ACCOUNT_PROJECT_IDENTITY",
  "DIRECT_BILLING_ROUTE",
  "DATA_REGION",
  "PRICE_SOURCE",
  "ZERO_CONTENT_PROBE_GRAPH",
]);

function add(errors, condition, message) {
  if (!condition && !errors.includes(message)) errors.push(message);
}

function signaturePayload(input) {
  return Object.freeze({
    schemaVersion: "TrustedProviderEvidenceSignaturePayloadV1",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash: input.activeRunnerRegistrationHash,
    claims: structuredClone(input.claims),
    evidenceArtifactHashes: [...input.evidenceArtifactHashes].sort(),
    trustAnchorId: input.trustAnchorId,
    capturedAt: input.capturedAt,
    expiresAt: input.expiresAt,
  });
}

export function buildTrustedProviderEvidenceEnvelopeV5R8(input) {
  const payload = signaturePayload(input);
  return assertClosedSelfHashedArtifactV5R8(sealV5R3Artifact({
    schemaVersion: "TrustedProviderEvidenceEnvelopeV1",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash: input.activeRunnerRegistrationHash,
    provider: input.claims.provider,
    model: input.claims.model,
    endpoint: input.claims.endpoint,
    projectResidency: input.claims.projectResidency,
    dataRegion: input.claims.dataRegion,
    subjectIdentityHash: input.claims.subjectIdentityHash,
    directBilling: input.claims.directBilling,
    priceSnapshotHash: input.claims.priceSnapshotHash,
    zeroContentProbeGraphHash: input.claims.zeroContentProbeGraphHash,
    claims: structuredClone(input.claims),
    evidenceArtifactHashes: [...input.evidenceArtifactHashes].sort(),
    evidenceArtifactSetHash: sha256V5R3(canonicalJsonV5R3([...input.evidenceArtifactHashes].sort())),
    trustAnchorId: input.trustAnchorId,
    signatureAlgorithm: "Ed25519",
    signaturePayload: payload,
    signaturePayloadHash: sha256V5R3(canonicalJsonV5R3(payload)),
    signatureBase64: input.signatureBase64 ?? null,
    evidenceDisposition: input.signatureBase64
      ? "TRUST_ANCHOR_SIGNATURE_PRESENT_REQUIRES_FULL_SOURCE_AND_PROBE_RECONSTRUCTION"
      : "UNRESOLVED_NO_TRUST_ANCHOR_SIGNATURE",
    capturedAt: input.capturedAt,
    expiresAt: input.expiresAt,
  }), "TrustedProviderEvidenceEnvelopeV1");
}

function validateEvidenceArtifacts(envelope, evidenceArtifacts) {
  const errors = [];
  const values = Array.isArray(evidenceArtifacts) ? evidenceArtifacts : [];
  add(errors, values.length === REQUIRED_KINDS.length
    && values.every((artifact) => validateClosedSelfHashedArtifactV5R8(artifact,
      "TrustedProviderEvidenceSourceV1").length === 0),
  "trusted provider evidence requires five closed, self-hashed source artifacts");
  const hashes = values.map(({ selfHash }) => selfHash).sort();
  add(errors, new Set(hashes).size === hashes.length
    && canonicalJsonV5R3(hashes) === canonicalJsonV5R3(envelope?.evidenceArtifactHashes ?? []),
  "trusted provider evidence artifact set differs from the signed exact hash set");
  const kinds = values.map(({ evidenceKind }) => evidenceKind);
  add(errors, new Set(kinds).size === REQUIRED_KINDS.length
    && canonicalJsonV5R3([...kinds].sort()) === canonicalJsonV5R3([...REQUIRED_KINDS].sort()),
  "trusted provider evidence source-kind set is incomplete or duplicated");
  for (const artifact of values) {
    add(errors, artifact.authenticatedSource === true
      && ["AUTHENTICATED_PROVIDER_EXPORT", "OFFICIAL_PROVIDER_RATE_CARD",
        "GUARDED_ZERO_CONTENT_PROBE_GRAPH"].includes(artifact.retrievalMode)
      && typeof artifact.sourceLocator === "string" && /^https:\/\//u.test(artifact.sourceLocator)
      && HASH.test(artifact.contentSha256 ?? "")
      && artifact.provider === envelope?.provider
      && artifact.model === envelope?.model
      && artifact.subjectIdentityHash === envelope?.subjectIdentityHash,
    `trusted provider ${artifact?.evidenceKind ?? "unknown"} source provenance is not authenticated and tuple-bound`);
  }
  const probe = values.find(({ evidenceKind }) => evidenceKind === "ZERO_CONTENT_PROBE_GRAPH");
  add(errors, probe?.selfHash === envelope?.zeroContentProbeGraphHash
    && probe?.retrievalMode === "GUARDED_ZERO_CONTENT_PROBE_GRAPH"
    && probe?.endpoint === envelope?.endpoint
    && probe?.graphStatus === "COMPLETE_VALID"
    && probe?.providerEventCount === 1
    && probe?.httpRequestCount === 1
    && probe?.naturalQuestionContentCount === 0
    && probe?.requestArtifactHash && HASH.test(probe.requestArtifactHash)
    && probe?.providerEventReceiptHash && HASH.test(probe.providerEventReceiptHash)
    && probe?.rawResponseArtifactHash && HASH.test(probe.rawResponseArtifactHash)
    && probe?.rawResponseBindingReceiptHash && HASH.test(probe.rawResponseBindingReceiptHash)
    && probe?.resolvedAttemptReceiptHash && HASH.test(probe.resolvedAttemptReceiptHash),
  "trusted provider zero-content probe was not rebuilt from a complete guarded attempt graph");
  const price = values.find(({ evidenceKind }) => evidenceKind === "PRICE_SOURCE");
  add(errors, price?.selfHash === envelope?.priceSnapshotHash
    && price?.retrievalMode === "OFFICIAL_PROVIDER_RATE_CARD"
    && price?.currency === "USD"
    && Number.isFinite(price?.inputUsdPerMillionTokens) && price.inputUsdPerMillionTokens >= 0
    && Number.isFinite(price?.outputUsdPerMillionTokens) && price.outputUsdPerMillionTokens >= 0,
  "trusted provider price source is absent or does not equal the signed official snapshot");
  const billing = values.find(({ evidenceKind }) => evidenceKind === "DIRECT_BILLING_ROUTE");
  add(errors, billing?.directBilling === true,
    "trusted provider evidence does not prove a direct billing route");
  const region = values.find(({ evidenceKind }) => evidenceKind === "DATA_REGION");
  add(errors, region?.projectResidency === envelope?.projectResidency
    && region?.dataRegion === envelope?.dataRegion,
  "trusted provider evidence residency or data region differs from the signed tuple");
  return errors;
}

export function validateTrustedProviderEvidenceEnvelopeV5R8({ envelope, activeRegistration,
  evidenceArtifacts, at = null }) {
  const errors = [];
  const schemaErrors = validateClosedSelfHashedArtifactV5R8(envelope,
    "TrustedProviderEvidenceEnvelopeV1");
  add(errors, schemaErrors.length === 0,
    `trusted provider evidence envelope fails its closed schema or self-hash: ${schemaErrors.join("; ")}`);
  add(errors, envelope?.activeRunnerRegistrationHash === activeRegistration?.selfHash,
    "trusted provider evidence does not bind the exact active runner registration");
  const expectedPayload = envelope ? signaturePayload(envelope) : null;
  add(errors, expectedPayload !== null
    && canonicalJsonV5R3(envelope.signaturePayload) === canonicalJsonV5R3(expectedPayload)
    && envelope.signaturePayloadHash === sha256V5R3(canonicalJsonV5R3(expectedPayload)),
  "trusted provider evidence signature payload is not canonical or exact");
  add(errors, envelope?.provider === envelope?.claims?.provider
    && envelope?.model === envelope?.claims?.model
    && envelope?.endpoint === envelope?.claims?.endpoint
    && envelope?.projectResidency === envelope?.claims?.projectResidency
    && envelope?.dataRegion === envelope?.claims?.dataRegion
    && envelope?.subjectIdentityHash === envelope?.claims?.subjectIdentityHash
    && envelope?.directBilling === envelope?.claims?.directBilling
    && envelope?.priceSnapshotHash === envelope?.claims?.priceSnapshotHash
    && envelope?.zeroContentProbeGraphHash === envelope?.claims?.zeroContentProbeGraphHash,
  "trusted provider evidence top-level tuple differs from signed claims");
  add(errors, Array.isArray(envelope?.evidenceArtifactHashes)
    && new Set(envelope.evidenceArtifactHashes).size === envelope.evidenceArtifactHashes.length
    && envelope.evidenceArtifactHashes.every((value) => HASH.test(value))
    && envelope.evidenceArtifactSetHash
      === sha256V5R3(canonicalJsonV5R3(envelope.evidenceArtifactHashes)),
  "trusted provider evidence hash set is invalid");
  errors.push(...validateEvidenceArtifacts(envelope, evidenceArtifacts));

  const anchors = Array.isArray(activeRegistration?.trustedProviderEvidenceAnchors)
    ? activeRegistration.trustedProviderEvidenceAnchors : [];
  const anchor = anchors.find(({ trustAnchorId }) => trustAnchorId === envelope?.trustAnchorId);
  add(errors, Boolean(anchor) && anchor?.algorithm === "Ed25519"
    && typeof anchor?.publicKeySpkiPem === "string"
    && HASH.test(anchor?.publicKeyFingerprint ?? ""),
  "trusted provider evidence has no pinned Ed25519 trust anchor in the active registration");
  if (anchor) {
    try {
      const publicKey = createPublicKey(anchor.publicKeySpkiPem);
      const fingerprint = sha256V5R3(publicKey.export({ type: "spki", format: "der" }));
      add(errors, fingerprint === anchor.publicKeyFingerprint,
        "trusted provider evidence public-key fingerprint differs from the pinned anchor");
      const signature = typeof envelope?.signatureBase64 === "string"
        ? Buffer.from(envelope.signatureBase64, "base64") : null;
      add(errors, signature && signature.length > 0
        && verify(null, Buffer.from(canonicalJsonV5R3(envelope.signaturePayload), "utf8"),
          publicKey, signature),
      "trusted provider evidence signature is absent or invalid");
    } catch {
      add(errors, false, "trusted provider evidence trust anchor or signature cannot be parsed");
    }
  } else {
    add(errors, false, "trusted provider evidence signature cannot be verified without a pinned trust anchor");
  }
  const captured = Date.parse(envelope?.capturedAt ?? "");
  const expires = Date.parse(envelope?.expiresAt ?? "");
  const checkAt = Date.parse(at ?? envelope?.capturedAt ?? "");
  add(errors, [captured, expires, checkAt].every(Number.isFinite)
    && captured <= checkAt && checkAt < expires,
  "trusted provider evidence chronology is invalid or expired");
  add(errors, envelope?.evidenceDisposition
    === "TRUST_ANCHOR_SIGNATURE_PRESENT_REQUIRES_FULL_SOURCE_AND_PROBE_RECONSTRUCTION",
  "trusted provider evidence remains unresolved because no signed trust-anchored envelope is present");
  return Object.freeze([...new Set(errors)]);
}

export const TRUSTED_PROVIDER_EVIDENCE_V5_R8_CONSTANTS = Object.freeze({
  requiredEvidenceKinds: REQUIRED_KINDS,
  signatureAlgorithm: "Ed25519",
  callerAuthoredConfirmationAccepted: false,
  noPinnedAnchorDisposition: "ROUTE_AUTHENTICITY_BLOCKED",
});
