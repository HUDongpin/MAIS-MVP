import {
  OPENAI_REFERENCE_ADAPTER_TRANSFORM_HASH_V5,
  buildOpenAIReferenceLogicalRequestV5,
  buildOpenAIReferenceWireRequestV5,
} from "./openai-reference-adapter-v5.mjs";
import {
  DEEPSEEK_EVALUATION_ADAPTER_V5_R2_CONSTANTS,
  buildDeepSeekEvaluationRequestV5R2,
} from "./deepseek-evaluation-adapter-v5-r2.mjs";
import { sealV5R3Artifact, validateSelfHashV5R3 } from "./execution-integrity-v5-r3.mjs";

const OPENAI_PRIOR_FIELDS = Object.freeze({
  A_SOLVE: Object.freeze({}),
  A_LABEL: Object.freeze({ A_SOLVE: "itemSolveArtifact" }),
  B_SOLVE: Object.freeze({}),
  B_LABEL: Object.freeze({ B_SOLVE: "itemSolveArtifact" }),
  ADJUDICATOR: Object.freeze({ A_SOLVE: "aSolveArtifact", A_LABEL: "aLabelArtifact", B_SOLVE: "bSolveArtifact", B_LABEL: "bLabelArtifact" }),
});

function frozenIdentity(input) {
  for (const key of ["itemHash", "sampleManifestHash", "samplePayloadSetHash", "privacyScreenHash", "rightsScreenHash"]) {
    if (!/^[0-9a-f]{64}$/u.test(input[key] ?? "")) throw new TypeError(`${key} is invalid`);
  }
  if (typeof input.itemIdPseudonym !== "string" || input.itemIdPseudonym.length === 0
    || typeof input.clusterId !== "string" || input.clusterId.length === 0
    || typeof input.attemptId !== "string" || input.attemptId.length === 0) {
    throw new TypeError("request attempt/item pseudonym is invalid");
  }
  return {
    attemptId: input.attemptId,
    itemHash: input.itemHash,
    itemIdPseudonym: input.itemIdPseudonym,
    clusterId: input.clusterId,
    sampleManifestHash: input.sampleManifestHash,
    samplePayloadSetHash: input.samplePayloadSetHash,
    privacyScreenHash: input.privacyScreenHash,
    rightsScreenHash: input.rightsScreenHash,
  };
}

function priorHashes(providerInput, mapping) {
  const result = {};
  for (const [role, field] of Object.entries(mapping)) {
    const artifact = providerInput[field];
    if (!validateSelfHashV5R3(artifact)) throw new TypeError(`${role} prior artifact self-hash is invalid`);
    result[role] = artifact.selfHash;
  }
  return result;
}

export function buildOpenAIReferenceRequestV5R3(input) {
  const mapping = OPENAI_PRIOR_FIELDS[input.role];
  if (!mapping) throw new TypeError("OpenAI role is outside the frozen reference panel");
  const logicalRequest = buildOpenAIReferenceLogicalRequestV5({ role: input.role, providerInput: input.providerInput });
  const wireRequest = buildOpenAIReferenceWireRequestV5(logicalRequest);
  return sealV5R3Artifact({
    schemaVersion: "OpenAIReferenceRequestV5R3",
    provider: "OPENAI_DIRECT",
    model: "gpt-5.6-luna",
    endpoint: "https://us.api.openai.com/v1/responses",
    role: input.role,
    ...frozenIdentity(input),
    logicalRequest,
    wireRequest,
    priorArtifactHashes: priorHashes(input.providerInput, mapping),
    deepSeekInputCount: 0,
    adapterTransformHash: OPENAI_REFERENCE_ADAPTER_TRANSFORM_HASH_V5,
  });
}

export function buildDeepSeekEvaluationRequestV5R3(input) {
  const adapterRequest = buildDeepSeekEvaluationRequestV5R2({ role: input.role, providerInput: input.providerInput });
  const mapping = input.role === "B_PRIME_REVISION" ? { B_PRIME_CRITIQUE: "bPrimeCritiqueArtifact" } : {};
  return sealV5R3Artifact({
    schemaVersion: "DeepSeekEvaluationRequestV5R3",
    provider: "DEEPSEEK_DIRECT",
    model: "deepseek-v4-pro",
    endpoint: "https://api.deepseek.com/chat/completions",
    role: input.role,
    ...frozenIdentity(input),
    logicalRequest: adapterRequest.logicalRequest,
    wireRequest: adapterRequest.wireRequestBody,
    adapterRequest,
    priorArtifactHashes: priorHashes(input.providerInput, mapping),
    referenceInputCount: 0,
    adapterTransformHash: DEEPSEEK_EVALUATION_ADAPTER_V5_R2_CONSTANTS.adapterTransformHash,
  });
}

export const PROVIDER_REQUEST_ADAPTER_V5_R3_CONSTANTS = Object.freeze({ openAIPriorFields: OPENAI_PRIOR_FIELDS });
