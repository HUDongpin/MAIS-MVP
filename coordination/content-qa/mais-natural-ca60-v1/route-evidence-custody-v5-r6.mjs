import path from "node:path";

import CAPTURE_SCHEMA from "./schemas/ProviderEvidenceCaptureReceiptV1.schema.json" with { type: "json" };
import ROUTE_SCHEMA from "./schemas/AuthenticatedRouteEvidenceReceiptV2.schema.json" with { type: "json" };
import PROTECTED_SOURCE_SCHEMA from "./schemas/ProtectedProviderEvidenceArtifactV1.schema.json" with { type: "json" };

import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  assertClosedSelfHashedAgainstV5R5,
  validateClosedSelfHashedAgainstV5R5,
} from "./schema-contract-v5-r5.mjs";
import {
  atomicWriteProtectedJsonV5R4,
  establishProtectedRootV5R4,
  readProtectedJsonV5R4,
} from "./protected-storage-v5-r4.mjs";

const HASH = /^[0-9a-f]{64}$/u;
const REQUIRED_KINDS = Object.freeze([
  "ACCOUNT_PROJECT_IDENTITY",
  "DIRECT_BILLING_ROUTE",
  "DATA_REGION",
  "PRICE",
  "ROUTE_PROBE_RESPONSE",
]);
const SOURCE_KIND_BY_EVIDENCE = Object.freeze({
  ACCOUNT_PROJECT_IDENTITY: Object.freeze(["PROVIDER_CONSOLE_EXPORT"]),
  DIRECT_BILLING_ROUTE: Object.freeze(["PROVIDER_BILLING_EXPORT"]),
  DATA_REGION: Object.freeze(["PROVIDER_CONSOLE_EXPORT"]),
  PRICE: Object.freeze(["PROVIDER_OFFICIAL_RATE_CARD", "PROVIDER_BILLING_EXPORT"]),
  ROUTE_PROBE_RESPONSE: Object.freeze(["GUARDED_ZERO_CONTENT_ROUTE_PROBE"]),
});

function requireCondition(condition, message) {
  if (!condition) throw new TypeError(message);
}

function iso(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}

function exactTuple(input) {
  if (input.provider === "OPENAI_DIRECT") {
    requireCondition(input.model === "gpt-5.6-luna" && input.endpoint === "https://us.api.openai.com/v1/responses"
      && input.projectResidency === "US_STORAGE_PROCESSING" && input.dataRegion === "US",
    "OpenAI route evidence tuple must prove the frozen US storage-processing route");
  } else if (input.provider === "DEEPSEEK_DIRECT") {
    requireCondition(input.model === "deepseek-v4-pro" && input.endpoint === "https://api.deepseek.com/chat/completions"
      && !/UNKNOWN|PENDING|UNRESOLVED/iu.test(`${input.projectResidency}:${input.dataRegion}`),
    "DeepSeek route evidence requires resolved residency and data region");
  } else {
    throw new TypeError("route evidence provider is invalid");
  }
}

const SECRET_KEY = /(?:^|_)(?:api_?key|access_?token|refresh_?token|authorization|password|passwd|secret|credential|private_?key|session_?cookie)(?:$|_)/iu;
const SECRET_VALUE = /(?:\bBearer\s+[A-Za-z0-9._~+/=-]{8,}|\bsk-[A-Za-z0-9_-]{8,}|-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----|(?:api[_ -]?key|access[_ -]?token|password|secret)\s*[:=]\s*["']?[^\s"']{8,})/iu;

function recursiveSecretScan(value, key = "") {
  if (SECRET_KEY.test(key)) return true;
  if (typeof value === "string") return SECRET_VALUE.test(value);
  if (Array.isArray(value)) return value.some((entry) => recursiveSecretScan(entry));
  if (value && typeof value === "object") {
    return Object.entries(value).some(([childKey, entry]) => recursiveSecretScan(entry, childKey));
  }
  return false;
}

function credentialLikeMaterialDetected(rawSourceBody) {
  if (SECRET_VALUE.test(rawSourceBody)) return true;
  try { return recursiveSecretScan(JSON.parse(rawSourceBody)); }
  catch { return false; }
}

export function buildProtectedProviderEvidenceArtifactV5R6(input) {
  exactTuple(input);
  requireCondition(REQUIRED_KINDS.includes(input.evidenceKind)
    && SOURCE_KIND_BY_EVIDENCE[input.evidenceKind].includes(input.sourceKind),
  "protected route source evidence kind or source kind is invalid");
  requireCondition(HASH.test(input.activeRunnerRegistrationHash ?? "")
    && HASH.test(input.sourceLocatorHash ?? "") && iso(input.capturedAt),
  "protected route source identity, locator, or capture time is invalid");
  requireCondition(typeof input.rawSourceBody === "string", "protected route source must retain UTF-8 text bytes");
  const bytes = Buffer.from(input.rawSourceBody, "utf8");
  requireCondition(bytes.byteLength >= 2 && bytes.byteLength <= 16 * 1024 * 1024,
    "protected route source byte length is outside the custody limits");
  requireCondition(!credentialLikeMaterialDetected(input.rawSourceBody),
    "protected route source contains credential-like material and cannot enter evidence custody");
  const artifact = sealV5R3Artifact({
    schemaVersion: "ProtectedProviderEvidenceArtifactV1",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash: input.activeRunnerRegistrationHash,
    provider: input.provider,
    model: input.model,
    endpoint: input.endpoint,
    projectResidency: input.projectResidency,
    dataRegion: input.dataRegion,
    evidenceKind: input.evidenceKind,
    sourceKind: input.sourceKind,
    sourceLocatorHash: input.sourceLocatorHash,
    rawSourceEncoding: "UTF-8",
    rawSourceByteLength: bytes.byteLength,
    rawSourceBytesHash: sha256V5R3(bytes),
    rawSourceBody: input.rawSourceBody,
    credentialLikeMaterialDetected: false,
    secretScanVersion: "RECURSIVE_SECRET_LIKE_MATERIAL_SCAN_V1",
    capturedAt: input.capturedAt,
  });
  assertClosedSelfHashedAgainstV5R5(artifact, PROTECTED_SOURCE_SCHEMA, artifact.schemaVersion);
  return artifact;
}

export function validateProtectedProviderEvidenceArtifactV5R6(artifact) {
  const errors = [...validateClosedSelfHashedAgainstV5R5(artifact, PROTECTED_SOURCE_SCHEMA)];
  try {
    const rebuilt = buildProtectedProviderEvidenceArtifactV5R6({ ...artifact, selfHash: undefined });
    if (canonicalJsonV5R3(rebuilt) !== canonicalJsonV5R3(artifact)) {
      errors.push("protected route source differs from exact retained-byte reconstruction");
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return Object.freeze([...new Set(errors)]);
}

export async function createProtectedProviderEvidenceCustodyStoreV5R6({ protectedRoot }) {
  const trustedRoot = await establishProtectedRootV5R4(protectedRoot);
  return Object.freeze({
    async persist(input) {
      const artifact = buildProtectedProviderEvidenceArtifactV5R6(input);
      const relativePath = path.join("route-source-custody-v5-r6", input.provider.toLowerCase(),
        input.evidenceKind.toLowerCase(), `${artifact.selfHash}.json`);
      try {
        const existing = await readProtectedJsonV5R4({ trustedRoot, relativePath });
        requireCondition(canonicalJsonV5R3(existing) === canonicalJsonV5R3(artifact),
          "content-addressed protected route source contains different bytes");
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
        await atomicWriteProtectedJsonV5R4({ trustedRoot, relativePath, value: artifact });
      }
      return Object.freeze({ artifact, relativePath, absolutePath: path.join(trustedRoot.root, relativePath) });
    },
  });
}

export function buildRouteEvidenceCaptureReceiptV5R6(input) {
  exactTuple(input);
  requireCondition(HASH.test(input.activeRunnerRegistrationHash ?? "") && HASH.test(input.subjectIdentityHash ?? ""),
    "route capture registration or subject binding is invalid");
  requireCondition(REQUIRED_KINDS.includes(input.evidenceKind), "route capture evidence kind is invalid");
  requireCondition(SOURCE_KIND_BY_EVIDENCE[input.evidenceKind].includes(input.sourceKind),
    `${input.evidenceKind} source kind is not permitted for independently replayable route evidence`);
  const rawSourceArtifact = input.rawSourceArtifact;
  requireCondition(validateProtectedProviderEvidenceArtifactV5R6(rawSourceArtifact).length === 0,
    "route capture requires a valid protected raw-source artifact; caller-authored hashes alone are forbidden");
  for (const field of ["activeRunnerRegistrationHash", "provider", "model", "endpoint", "projectResidency",
    "dataRegion", "evidenceKind", "sourceKind"]) {
    requireCondition(rawSourceArtifact[field] === input[field], `protected raw-source ${field} differs from route capture`);
  }
  requireCondition(iso(input.expiresAt) && Date.parse(rawSourceArtifact.capturedAt) < Date.parse(input.expiresAt),
    "route capture chronology is invalid");
  requireCondition(HASH.test(input.authenticatedSessionEvidenceHash ?? "")
    && HASH.test(input.ownerAttestationReceiptHash ?? ""),
  "route capture requires authenticated session provenance and an exact owner attestation receipt");
  const isProbe = input.evidenceKind === "ROUTE_PROBE_RESPONSE";
  requireCondition(isProbe === (input.captureLane === "A07")
    && (!isProbe || (HASH.test(input.guardedProviderEventReceiptHash ?? "")
      && HASH.test(input.zeroNaturalContentRequestHash ?? "")))
    && (isProbe || (input.captureLane === "A19" && input.guardedProviderEventReceiptHash == null
      && input.zeroNaturalContentRequestHash == null)),
  "route-probe evidence must bind a guarded zero-content provider event; non-probe evidence must be A19-captured without a probe claim");
  const receipt = sealV5R3Artifact({
    schemaVersion: "ProviderEvidenceCaptureReceiptV1",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash: input.activeRunnerRegistrationHash,
    provider: input.provider,
    model: input.model,
    endpoint: input.endpoint,
    projectResidency: input.projectResidency,
    dataRegion: input.dataRegion,
    subjectIdentityHash: input.subjectIdentityHash,
    evidenceKind: input.evidenceKind,
    sourceKind: input.sourceKind,
    rawSourceArtifactHash: rawSourceArtifact.selfHash,
    rawSourceBytesHash: rawSourceArtifact.rawSourceBytesHash,
    rawSourceByteLength: rawSourceArtifact.rawSourceByteLength,
    sourceLocatorHash: rawSourceArtifact.sourceLocatorHash,
    captureLane: input.captureLane,
    authenticatedSessionEvidenceHash: input.authenticatedSessionEvidenceHash,
    ownerAttestationReceiptHash: input.ownerAttestationReceiptHash,
    guardedProviderEventReceiptHash: input.guardedProviderEventReceiptHash ?? null,
    zeroNaturalContentRequestHash: input.zeroNaturalContentRequestHash ?? null,
    credentialLikeMaterialDetected: false,
    capturedAt: rawSourceArtifact.capturedAt,
    expiresAt: input.expiresAt,
  });
  assertClosedSelfHashedAgainstV5R5(receipt, CAPTURE_SCHEMA, receipt.schemaVersion);
  return receipt;
}

export function validateRouteEvidenceCaptureReceiptV5R6(receipt, rawSourceArtifact) {
  const errors = [...validateClosedSelfHashedAgainstV5R5(receipt, CAPTURE_SCHEMA)];
  errors.push(...validateProtectedProviderEvidenceArtifactV5R6(rawSourceArtifact));
  if (rawSourceArtifact?.selfHash !== receipt?.rawSourceArtifactHash
    || rawSourceArtifact?.rawSourceBytesHash !== receipt?.rawSourceBytesHash
    || rawSourceArtifact?.rawSourceByteLength !== receipt?.rawSourceByteLength
    || rawSourceArtifact?.sourceLocatorHash !== receipt?.sourceLocatorHash) {
    errors.push("route capture does not bind the supplied protected raw-source artifact");
  }
  try {
    const rebuilt = buildRouteEvidenceCaptureReceiptV5R6({
      ...receipt,
      selfHash: undefined,
      rawSourceArtifact,
    });
    if (canonicalJsonV5R3(rebuilt) !== canonicalJsonV5R3(receipt)) {
      errors.push("route capture differs from exact protected-source provenance reconstruction");
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return Object.freeze([...new Set(errors)]);
}

export function buildExternallyAttestedRouteEvidenceV5R6(input) {
  exactTuple(input);
  requireCondition(Array.isArray(input.captures) && input.captures.length === REQUIRED_KINDS.length,
    "externally attested route evidence requires exactly five capture receipts");
  requireCondition(Array.isArray(input.rawSourceArtifacts)
    && input.rawSourceArtifacts.length === REQUIRED_KINDS.length,
  "externally attested route evidence requires exactly five protected raw-source artifacts");
  const byKind = new Map(input.captures.map((capture) => [capture?.evidenceKind, capture]));
  const rawByKind = new Map(input.rawSourceArtifacts.map((artifact) => [artifact?.evidenceKind, artifact]));
  requireCondition(byKind.size === REQUIRED_KINDS.length && REQUIRED_KINDS.every((kind) => byKind.has(kind)),
    "externally attested route evidence capture kinds are missing or duplicated");
  requireCondition(rawByKind.size === REQUIRED_KINDS.length && REQUIRED_KINDS.every((kind) => rawByKind.has(kind)),
    "externally attested route evidence protected raw-source kinds are missing or duplicated");
  const captures = REQUIRED_KINDS.map((kind) => byKind.get(kind));
  const rawSourceArtifacts = REQUIRED_KINDS.map((kind) => rawByKind.get(kind));
  for (const [index, capture] of captures.entries()) {
    requireCondition(validateRouteEvidenceCaptureReceiptV5R6(capture, rawSourceArtifacts[index]).length === 0,
      `route capture ${capture?.evidenceKind ?? "UNKNOWN"} is invalid`);
    for (const field of ["activeRunnerRegistrationHash", "provider", "model", "endpoint", "projectResidency",
      "dataRegion", "subjectIdentityHash"]) {
      requireCondition(capture[field] === input[field], `route capture ${capture.evidenceKind} ${field} differs from the route bundle`);
    }
  }
  requireCondition(input.directBillingConfirmed === true, "direct billing must be confirmed by the billing capture");
  requireCondition(Number.isFinite(input.inputUsdPerMillionTokens) && input.inputUsdPerMillionTokens > 0
    && Number.isFinite(input.outputUsdPerMillionTokens) && input.outputUsdPerMillionTokens > 0,
  "route evidence price rates must be positive USD values");
  requireCondition(iso(input.validatedAt) && captures.every(({ capturedAt, expiresAt }) =>
    Date.parse(capturedAt) <= Date.parse(input.validatedAt) && Date.parse(input.validatedAt) < Date.parse(expiresAt)),
  "route evidence validation time is outside capture validity");
  const receipt = sealV5R3Artifact({
    schemaVersion: "AuthenticatedRouteEvidenceReceiptV2",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash: input.activeRunnerRegistrationHash,
    provider: input.provider,
    model: input.model,
    endpoint: input.endpoint,
    projectResidency: input.projectResidency,
    dataRegion: input.dataRegion,
    subjectIdentityHash: input.subjectIdentityHash,
    directBillingConfirmed: true,
    routeProbeConfirmed: true,
    routeProbeContainsNaturalQuestionText: false,
    priceCurrency: "USD",
    inputUsdPerMillionTokens: input.inputUsdPerMillionTokens,
    outputUsdPerMillionTokens: input.outputUsdPerMillionTokens,
    captures: captures.map((capture) => structuredClone(capture)),
    captureSetHash: sha256V5R3(canonicalJsonV5R3(captures.map(({ selfHash }) => selfHash))),
    rawSourceArtifacts: rawSourceArtifacts.map((artifact) => structuredClone(artifact)),
    rawSourceArtifactSetHash: sha256V5R3(canonicalJsonV5R3(rawSourceArtifacts.map(({ selfHash }) => selfHash))),
    provenanceStatus: "EXTERNALLY_ATTESTED_AND_REPLAYABLE",
    validatedAt: input.validatedAt,
    authorizationEligibility: "ELIGIBLE_PENDING_SEPARATE_OWNER_PROVIDER_GRANT",
  });
  assertClosedSelfHashedAgainstV5R5(receipt, ROUTE_SCHEMA, receipt.schemaVersion);
  return receipt;
}

export function validateExternallyAttestedRouteEvidenceV5R6(receipt) {
  const errors = [...validateClosedSelfHashedAgainstV5R5(receipt, ROUTE_SCHEMA)];
  try {
    const rebuilt = buildExternallyAttestedRouteEvidenceV5R6({
      ...receipt,
      selfHash: undefined,
      directBillingConfirmed: receipt.directBillingConfirmed,
    });
    if (canonicalJsonV5R3(rebuilt) !== canonicalJsonV5R3(receipt)) {
      errors.push("externally attested route evidence differs from exact capture reconstruction");
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return Object.freeze([...new Set(errors)]);
}

export const ROUTE_EVIDENCE_CUSTODY_V5_R6_CONSTANTS = Object.freeze({
  requiredKinds: REQUIRED_KINDS,
  sourceKindsByEvidenceKind: SOURCE_KIND_BY_EVIDENCE,
  callerAuthoredJsonAloneAccepted: false,
  callerAuthoredHashesAloneAccepted: false,
  rawSourceBytesRetainedInProtectedStorage: true,
  secretScanVersion: "RECURSIVE_SECRET_LIKE_MATERIAL_SCAN_V1",
});
