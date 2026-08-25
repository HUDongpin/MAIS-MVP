import {
  canonicalJson,
  jcsHash,
} from "../../research/mais-natural-ca60-v1/versions/design-v5/design-contract.mjs";
import {
  ACTIVE_V5_PROVIDER_CHRONOLOGY_RULE,
  ACTIVE_V5_RUNTIME_SOURCE_ENUMERATION_EVIDENCE_CONTRACT_HASH,
  RUNTIME_SOURCE_ENUMERATION_EVIDENCE_CONTRACT_HASH,
} from "./sample-contract-v5.mjs";

const DESIGN_ID = "MAIS-NATURAL-CA60-V5";
const REGISTRATION_HASH = "e240f1fb1af588fb3dbf085b8f57af1c41635bdb8576be8019838d4512fa0632";
const OWNER_DECISION_RECEIPT_HASH = "855af9696548359bc7364a987aa0dc3a3f9cd5883f87911edd8067bc78ac3ad0";

function assertCanonicalTimestamp(value, field) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) {
    throw new TypeError(`${field} must be canonical RFC3339 UTC with milliseconds`);
  }
}

export function buildV5SourceEnumerationHashErratum({ recordedAt }) {
  assertCanonicalTimestamp(recordedAt, "recordedAt");
  const body = {
    schemaVersion: "NaturalCaV5SourceEnumerationHashErratumV1",
    artifactKind: "APPEND_ONLY_PRE_PROVIDER_NESTED_HASH_ERRATUM_NOT_DESIGN_REWRITE",
    designId: DESIGN_ID,
    registrationHash: REGISTRATION_HASH,
    ownerDecisionReceiptHash: OWNER_DECISION_RECEIPT_HASH,
    status: "RECORDED_PRE_PROVIDER_DUAL_ROOT_BINDING_REQUIRED",
    issueCode: "V5_PROVIDER_NAMED_CHRONOLOGY_MIGRATED_WITH_STALE_INHERITED_NESTED_HASH",
    inheritedMethodContractHash: RUNTIME_SOURCE_ENUMERATION_EVIDENCE_CONTRACT_HASH,
    registeredDeclaredHash: RUNTIME_SOURCE_ENUMERATION_EVIDENCE_CONTRACT_HASH,
    activeV5ProviderChronologyContractHash: ACTIVE_V5_RUNTIME_SOURCE_ENUMERATION_EVIDENCE_CONTRACT_HASH,
    activeV5ProviderChronologyRule: ACTIVE_V5_PROVIDER_CHRONOLOGY_RULE,
    hashesAreIntentionallyDistinct: true,
    inheritedMethodReceiptBinding: "RuntimeSourceEnumerationReceiptV1.evidenceContractHash",
    activeV5ChronologyBinding: "NaturalCaFormalFreezeReceiptV1.activeV5ProviderChronologyContractHash",
    resolution: "PRESERVE_V4_EXTRACTION_METHOD_HASH_AND_SEPARATELY_BIND_RECOMPUTED_V5_PROVIDER_CHRONOLOGY_HASH",
    registrationFileRewritten: false,
    priorReceiptRewritten: false,
    changesFrameMethod: false,
    changesSampleMethod: false,
    changesEligibilityOrRights: false,
    changesLineageRule: false,
    changesDecisionThresholds: false,
    changesProviderRoute: false,
    providerEventCountAtDiscovery: 0,
    credentialReadCountAtDiscovery: 0,
    naturalQuestionEgressCountAtDiscovery: 0,
    authorizesProviderExecution: false,
    authorizesCredentialRead: false,
    authorizesQuestionEgress: false,
    authorizesTokensAttemptsOrUsd: false,
    requiresFormalFreezeReceiptBinding: true,
    requiresFutureProviderAuthorizationBinding: true,
    recordedAt,
  };
  return Object.freeze({ ...body, erratumHash: jcsHash(body) });
}

export function validateV5SourceEnumerationHashErratum(receipt) {
  const errors = [];
  try {
    if (!receipt || typeof receipt !== "object" || Array.isArray(receipt)) {
      return ["source-enumeration hash erratum must be an object"];
    }
    const expected = buildV5SourceEnumerationHashErratum({ recordedAt: receipt.recordedAt });
    if (canonicalJson(receipt) !== canonicalJson(expected)) {
      errors.push("source-enumeration hash erratum semantic mismatch");
    }
    const { erratumHash, ...body } = receipt;
    if (erratumHash !== jcsHash(body)) errors.push("source-enumeration hash erratum self-hash mismatch");
  } catch (error) {
    errors.push(`source-enumeration hash erratum validation failed closed: ${error instanceof Error ? error.name : "UnknownError"}`);
  }
  return errors;
}
