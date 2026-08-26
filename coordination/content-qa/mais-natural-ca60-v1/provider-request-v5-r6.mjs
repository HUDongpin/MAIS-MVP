import AUTHORIZATION_SCHEMA from "./schemas/ProviderAuthorizationV5.schema.json" with { type: "json" };
import REQUEST_SCHEMA from "./schemas/ProviderRequestArtifactV5.schema.json" with { type: "json" };

import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
} from "./execution-integrity-v5-r3.mjs";
import {
  assertClosedSelfHashedAgainstV5R5,
  validateClosedSelfHashedAgainstV5R5,
} from "./schema-contract-v5-r5.mjs";
import {
  validateClosedSelfHashedArtifactV5R4,
} from "./schema-contract-v5-r4.mjs";
import {
  buildProviderRequestArtifactV5R4,
  exactProviderWireBytesV5R4,
} from "./provider-request-v5-r4.mjs";

const ROLE_SETS = Object.freeze({
  OPENAI_DIRECT: Object.freeze(["A_SOLVE", "A_LABEL", "B_SOLVE", "B_LABEL", "ADJUDICATOR"]),
  DEEPSEEK_DIRECT: Object.freeze(["B_PRIME_CRITIQUE", "B_PRIME_REVISION", "C0_PRIME_ROLE_1", "C0_PRIME_ROLE_2", "C0_PRIME_ROLE_3", "C0_PRIME_ROLE_4", "C0_PRIME_ROLE_5"]),
});

function requireCondition(condition, message) {
  if (!condition) throw new TypeError(message);
}

function exactSet(actual, expected) {
  return Array.isArray(actual) && new Set(actual).size === actual.length
    && canonicalJsonV5R3([...actual].sort()) === canonicalJsonV5R3([...expected].sort());
}

function assertResolvedTuple(input) {
  requireCondition(!/UNKNOWN|PENDING|UNRESOLVED/iu.test(`${input.projectResidency}:${input.dataRegion}`),
    "provider authorization residency and data region must be resolved");
  if (input.provider === "OPENAI_DIRECT") {
    requireCondition(input.model === "gpt-5.6-luna" && input.endpoint === "https://us.api.openai.com/v1/responses"
      && input.projectResidency === "US_STORAGE_PROCESSING" && input.dataRegion === "US",
    "OpenAI resolved authorization tuple is invalid");
  } else {
    requireCondition(input.provider === "DEEPSEEK_DIRECT" && input.model === "deepseek-v4-pro"
      && input.endpoint === "https://api.deepseek.com/chat/completions",
    "DeepSeek resolved authorization tuple is invalid");
  }
}

export function buildResolvedProviderAuthorizationV5R6(input) {
  assertResolvedTuple(input);
  const compatibility = input.compatibilityAuthorization;
  const compatibilityErrors = validateClosedSelfHashedArtifactV5R4(compatibility, "ProviderAuthorizationV4");
  requireCondition(compatibilityErrors.length === 0, compatibilityErrors.join("; "));
  requireCondition(compatibility.provider === input.provider && compatibility.model === input.model
    && compatibility.endpoint === input.endpoint && compatibility.projectIdentityHash === input.projectIdentityHash
    && exactSet(compatibility.roleSet, ROLE_SETS[input.provider]),
  "compatibility authorization differs from the resolved provider identity, tuple, or role set");
  if (input.provider === "OPENAI_DIRECT") {
    requireCondition(input.referenceSealHash === null && input.referenceAttemptChainHash === null
      && compatibility.referenceSealHash === null && compatibility.referenceAttemptChainHash === null,
    "OpenAI reference authorization must predate and therefore not bind a reference seal");
  } else {
    requireCondition(/^[0-9a-f]{64}$/u.test(input.referenceSealHash ?? "")
      && /^[0-9a-f]{64}$/u.test(input.referenceAttemptChainHash ?? "")
      && /^[0-9a-f]{64}$/u.test(compatibility.referenceSealHash ?? "")
      && compatibility.referenceAttemptChainHash === input.referenceAttemptChainHash,
    "DeepSeek resolved and compatibility authorizations must bind reference seals and the same attempt chain");
  }
  for (const field of ["maximumAttempts", "maximumSuccessfulCalls", "maximumInputTokens", "maximumOutputTokens",
    "maximumTokens", "maximumEstimatedUsd", "concurrencyCap", "maximumAttemptsPerItemRole"]) {
    requireCondition(input[field] === compatibility[field], `resolved authorization ${field} differs from compatibility cap`);
  }
  const authorization = sealV5R3Artifact({
    schemaVersion: "ProviderAuthorizationV5",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash: input.activeRunnerRegistrationHash,
    compatibilityBaseRunnerRegistrationHash: compatibility.runnerRegistrationHash,
    freshRunnerReviewHash: input.freshRunnerReviewHash,
    authenticatedRouteEvidenceHash: input.authenticatedRouteEvidenceHash,
    referenceSealHash: input.referenceSealHash,
    referenceAttemptChainHash: input.referenceAttemptChainHash,
    provider: input.provider,
    model: input.model,
    endpoint: input.endpoint,
    projectResidency: input.projectResidency,
    dataRegion: input.dataRegion,
    projectIdentityHash: input.projectIdentityHash,
    roleSet: [...ROLE_SETS[input.provider]],
    compatibilityAuthorizationHash: compatibility.selfHash,
    compatibilityAuthorization: structuredClone(compatibility),
    credentialReadAuthorized: input.credentialReadAuthorized,
    providerExecutionAuthorized: input.providerExecutionAuthorized,
    naturalQuestionEgressAuthorized: input.naturalQuestionEgressAuthorized,
    tokenAuthorizationCreated: input.tokenAuthorizationCreated,
    attemptAuthorizationCreated: input.attemptAuthorizationCreated,
    usdAuthorizationCreated: input.usdAuthorizationCreated,
    maximumAttempts: input.maximumAttempts,
    maximumSuccessfulCalls: input.maximumSuccessfulCalls,
    maximumInputTokens: input.maximumInputTokens,
    maximumOutputTokens: input.maximumOutputTokens,
    maximumTokens: input.maximumTokens,
    maximumEstimatedUsd: input.maximumEstimatedUsd,
    concurrencyCap: input.concurrencyCap,
    maximumAttemptsPerItemRole: input.maximumAttemptsPerItemRole,
    issuedAt: input.issuedAt,
    expiresAt: input.expiresAt,
    authorizedBy: input.authorizedBy,
    ownerAuthorizationTextHash: input.ownerAuthorizationTextHash,
  });
  assertClosedSelfHashedAgainstV5R5(authorization, AUTHORIZATION_SCHEMA, authorization.schemaVersion);
  return authorization;
}

export function validateResolvedProviderAuthorizationV5R6(authorization) {
  const errors = [...validateClosedSelfHashedAgainstV5R5(authorization, AUTHORIZATION_SCHEMA)];
  try {
    const rebuilt = buildResolvedProviderAuthorizationV5R6({ ...authorization, selfHash: undefined });
    if (canonicalJsonV5R3(rebuilt) !== canonicalJsonV5R3(authorization)) {
      errors.push("resolved provider authorization differs from exact compatibility and route reconstruction");
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return Object.freeze([...new Set(errors)]);
}

export function buildProviderRequestArtifactV5R6({ activeRegistration, authorization, registration, inventory,
  sampleManifest, itemLeaf, role, attemptId, ledgerEntries = [] }) {
  const authErrors = validateResolvedProviderAuthorizationV5R6(authorization);
  requireCondition(authErrors.length === 0, authErrors.join("; "));
  requireCondition(activeRegistration?.selfHash === authorization.activeRunnerRegistrationHash,
    "request active registration does not bind the resolved provider authorization");
  const compatibilityRequestArtifact = buildProviderRequestArtifactV5R4({
    registration,
    authorization: authorization.compatibilityAuthorization,
    inventory,
    sampleManifest,
    itemLeaf,
    role,
    attemptId,
    ledgerEntries,
  });
  const artifact = sealV5R3Artifact({
    schemaVersion: "ProviderRequestArtifactV5",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash: activeRegistration.selfHash,
    compatibilityBaseRunnerRegistrationHash: registration.selfHash,
    authorizationHash: authorization.selfHash,
    compatibilityAuthorizationHash: authorization.compatibilityAuthorizationHash,
    authenticatedRouteEvidenceHash: authorization.authenticatedRouteEvidenceHash,
    sampleManifestHash: compatibilityRequestArtifact.sampleManifestHash,
    sampleExecutionInventoryHash: compatibilityRequestArtifact.sampleExecutionInventoryHash,
    manifestOrdinal: compatibilityRequestArtifact.manifestOrdinal,
    itemHash: compatibilityRequestArtifact.itemHash,
    itemIdPseudonym: compatibilityRequestArtifact.itemIdPseudonym,
    clusterId: compatibilityRequestArtifact.clusterId,
    provider: authorization.provider,
    model: authorization.model,
    endpoint: authorization.endpoint,
    projectResidency: authorization.projectResidency,
    dataRegion: authorization.dataRegion,
    role: compatibilityRequestArtifact.role,
    attemptId: compatibilityRequestArtifact.attemptId,
    itemLeafHash: compatibilityRequestArtifact.itemLeafHash,
    providerInput: structuredClone(compatibilityRequestArtifact.providerInput),
    providerInputHash: compatibilityRequestArtifact.providerInputHash,
    providerInputFieldNames: [...compatibilityRequestArtifact.providerInputFieldNames],
    rolePromptHash: compatibilityRequestArtifact.rolePromptHash,
    roleSchemaHash: compatibilityRequestArtifact.roleSchemaHash,
    adapterTransformHash: compatibilityRequestArtifact.adapterTransformHash,
    logicalRequest: structuredClone(compatibilityRequestArtifact.logicalRequest),
    logicalRequestHash: compatibilityRequestArtifact.logicalRequestHash,
    wireRequest: structuredClone(compatibilityRequestArtifact.wireRequest),
    wireRequestBodyHash: compatibilityRequestArtifact.wireRequestBodyHash,
    wireRequestByteLength: compatibilityRequestArtifact.wireRequestByteLength,
    reservedInputTokens: compatibilityRequestArtifact.reservedInputTokens,
    reservedOutputTokens: compatibilityRequestArtifact.reservedOutputTokens,
    reservedTokens: compatibilityRequestArtifact.reservedTokens,
    referenceInputCount: 0,
    deepSeekInputCount: 0,
    priorCompletionHashes: [...compatibilityRequestArtifact.priorCompletionHashes],
    compatibilityRequestArtifactHash: compatibilityRequestArtifact.selfHash,
    compatibilityRequestArtifact: structuredClone(compatibilityRequestArtifact),
  });
  assertClosedSelfHashedAgainstV5R5(artifact, REQUEST_SCHEMA, artifact.schemaVersion);
  return artifact;
}

export function validateAndRebuildProviderRequestArtifactV5R6(input) {
  const errors = [...validateClosedSelfHashedAgainstV5R5(input?.requestArtifact, REQUEST_SCHEMA)];
  try {
    const rebuilt = buildProviderRequestArtifactV5R6({
      ...input,
      role: input.requestArtifact.role,
      attemptId: input.requestArtifact.attemptId,
    });
    if (canonicalJsonV5R3(rebuilt) !== canonicalJsonV5R3(input.requestArtifact)) {
      errors.push("resolved provider request differs from exact protected-item reconstruction");
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return Object.freeze([...new Set(errors)]);
}

export function exactProviderWireBytesV5R6(requestArtifact) {
  const errors = validateClosedSelfHashedAgainstV5R5(requestArtifact, REQUEST_SCHEMA);
  requireCondition(errors.length === 0, errors.join("; "));
  return exactProviderWireBytesV5R4(requestArtifact.compatibilityRequestArtifact);
}

export const PROVIDER_REQUEST_V5_R6_CONSTANTS = Object.freeze({
  roleSets: ROLE_SETS,
  compatibilitySentinelIsNotRouteEvidence: true,
  authoritativeResidencyFields: Object.freeze(["projectResidency", "dataRegion", "authenticatedRouteEvidenceHash"]),
});
