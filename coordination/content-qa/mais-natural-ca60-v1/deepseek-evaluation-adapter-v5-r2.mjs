import DESIGN_REGISTRATION from "../../research/mais-natural-ca60-v1/versions/design-v5/design-registration.json" with { type: "json" };
import {
  DEEPSEEK_ROLE_CONTRACTS,
  buildProviderRequestEvidenceV4,
  buildProviderWireEvidenceV4,
} from "../../research/mais-natural-ca60-v1/versions/design-v4/design-contract.mjs";
import {
  canonicalJson,
  jcsHash,
  sha256Hex,
} from "../../research/mais-natural-ca60-v1/versions/design-v5/design-contract.mjs";

const PROVIDER = "DEEPSEEK_DIRECT";
const ENDPOINT = "https://api.deepseek.com/chat/completions";
const MODEL = "deepseek-v4-pro";
const ADAPTER_VERSION = "DEEPSEEK_DIRECT_OPENAI_COMPAT_V5_R2_1";
const ADAPTER_HASH = jcsHash({
  version: ADAPTER_VERSION,
  inheritedRoleContractRootHash: DESIGN_REGISTRATION.providerControls.deepSeekRoleContractCatalog.inheritedRoleContractRootHash,
  inheritedRequestTemplateHash: DESIGN_REGISTRATION.providerControls.deepSeekRoleContractCatalog.inheritedRequestTemplateHash,
  provider: PROVIDER,
  endpoint: ENDPOINT,
  model: MODEL,
  referenceInputCount: 0,
});

function exactFields(value, fields) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    && canonicalJson(Object.keys(value).sort()) === canonicalJson([...fields].sort());
}

function roleContract(role) {
  const contract = DEEPSEEK_ROLE_CONTRACTS[role];
  const catalog = DESIGN_REGISTRATION.providerControls.deepSeekRoleContractCatalog.roles[role];
  if (!contract || !catalog || contract.promptHash !== catalog.promptHash || contract.schemaHash !== catalog.schemaHash) {
    throw new TypeError("DeepSeek role is unknown or its inherited frozen contract drifted");
  }
  return contract;
}

export function buildDeepSeekEvaluationRequestV5R2({ role, providerInput }) {
  const contract = roleContract(role);
  if (!exactFields(providerInput, contract.inputFieldNames)) {
    throw new TypeError("DeepSeek provider input fields differ from the frozen allowlist or contain reference data");
  }
  if (role === "B_PRIME_REVISION") {
    const artifact = providerInput.bPrimeCritiqueArtifact;
    if (!artifact || typeof artifact !== "object" || artifact.role !== "B_PRIME_CRITIQUE"
      || artifact.itemPseudonym !== providerInput.itemPseudonym || typeof artifact.parsedPayload !== "object") {
      throw new TypeError("DeepSeek B-prime revision requires the same-item frozen critique artifact");
    }
  }
  const request = buildProviderRequestEvidenceV4({
    provider: PROVIDER,
    role,
    endpoint: ENDPOINT,
    model: MODEL,
    systemPrompt: contract.promptLiteral,
    userPayload: structuredClone(providerInput),
    responseSchema: JSON.parse(contract.schemaLiteral),
    adapterTransformHash: ADAPTER_HASH,
  });
  if (canonicalJson(request.wireRequestBody) !== canonicalJson({
    ...DESIGN_REGISTRATION.providerControls.deepSeekEnvelope.wireRequestTemplate,
    messages: request.wireRequestBody.messages,
  })) {
    throw new Error("DeepSeek wire request differs from the frozen V5 envelope");
  }
  return Object.freeze({
    schemaVersion: "DeepSeekEvaluationRequestV5R2",
    designId: "MAIS-NATURAL-CA60-V5",
    registrationHash: DESIGN_REGISTRATION.registrationHash,
    provider: PROVIDER,
    endpoint: ENDPOINT,
    model: MODEL,
    role,
    logicalRequest: request.logicalRequest,
    logicalRequestHash: request.logicalRequestHash,
    wireRequestBody: request.wireRequestBody,
    wireRequestBodyBytes: request.wireRequestBodyBytes,
    wireRequestBodyHash: request.wireRequestBodyHash,
    adapterTransformVersion: ADAPTER_VERSION,
    adapterTransformHash: ADAPTER_HASH,
    referenceInputCount: 0,
  });
}

export function parseDeepSeekEvaluationResponseV5R2({ request, rawResponseBody }) {
  if (request?.schemaVersion !== "DeepSeekEvaluationRequestV5R2"
    || request?.designId !== "MAIS-NATURAL-CA60-V5"
    || request?.registrationHash !== DESIGN_REGISTRATION.registrationHash
    || request?.provider !== PROVIDER || request?.endpoint !== ENDPOINT || request?.model !== MODEL
    || request?.adapterTransformHash !== ADAPTER_HASH || request?.referenceInputCount !== 0) {
    throw new TypeError("DeepSeek response parser request binding is invalid");
  }
  if (typeof rawResponseBody !== "string") throw new TypeError("DeepSeek raw response body must be exact UTF-8 text");
  let envelope;
  try {
    envelope = JSON.parse(rawResponseBody);
  } catch {
    throw new TypeError("DeepSeek raw response is not valid JSON");
  }
  const content = envelope?.choices?.[0]?.message?.content;
  let structuredPayload;
  try {
    structuredPayload = JSON.parse(content);
  } catch {
    throw new TypeError("DeepSeek OpenAI-compatible message.content is not valid JSON");
  }
  const contract = roleContract(request.role);
  const wireEvidence = buildProviderWireEvidenceV4({
    provider: PROVIDER,
    role: request.role,
    endpoint: ENDPOINT,
    model: MODEL,
    systemPrompt: contract.promptLiteral,
    userPayload: structuredClone(request.logicalRequest.userPayload),
    responseSchema: JSON.parse(contract.schemaLiteral),
    adapterTransformHash: ADAPTER_HASH,
    rawWireResponseBytes: rawResponseBody,
    parsedRolePayload: structuredPayload,
  });
  if (wireEvidence.logicalRequestHash !== request.logicalRequestHash
    || wireEvidence.wireRequestBodyHash !== request.wireRequestBodyHash
    || canonicalJson(wireEvidence.wireRequestBody) !== canonicalJson(request.wireRequestBody)) {
    throw new TypeError("DeepSeek response evidence does not bind the frozen request");
  }
  if (wireEvidence.parsedRolePayloadSchemaStatus !== "CONFORMING") {
    throw new TypeError("DeepSeek structured role payload is nonconforming to the frozen schema");
  }
  const body = {
    schemaVersion: "DeepSeekEvaluationParseV5R2",
    designId: "MAIS-NATURAL-CA60-V5",
    registrationHash: DESIGN_REGISTRATION.registrationHash,
    provider: PROVIDER,
    requestedModel: MODEL,
    observedModel: wireEvidence.providerResponseModel,
    endpoint: ENDPOINT,
    role: request.role,
    responseId: wireEvidence.providerResponseId,
    finishReason: wireEvidence.finishReason,
    responseBodyHash: sha256Hex(rawResponseBody),
    structuredPayload,
    structuredPayloadHash: wireEvidence.parsedRolePayloadHash,
    usage: {
      inputTokens: wireEvidence.providerUsage.promptTokens,
      outputTokens: wireEvidence.providerUsage.completionTokens,
      reasoningTokens: wireEvidence.providerUsage.reasoningTokens,
      totalTokens: wireEvidence.providerUsage.totalTokens,
    },
    wireEvidence,
    referenceInputCount: 0,
  };
  return Object.freeze({ ...body, parseHash: jcsHash(body) });
}

export const DEEPSEEK_EVALUATION_ADAPTER_V5_R2_CONSTANTS = Object.freeze({
  provider: PROVIDER,
  endpoint: ENDPOINT,
  model: MODEL,
  roles: Object.freeze(Object.keys(DEEPSEEK_ROLE_CONTRACTS)),
  adapterTransformVersion: ADAPTER_VERSION,
  adapterTransformHash: ADAPTER_HASH,
  referenceInputCount: 0,
});
