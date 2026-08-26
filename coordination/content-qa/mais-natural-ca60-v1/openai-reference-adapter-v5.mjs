import { createHash } from "node:crypto";

import DESIGN_REGISTRATION from "../../research/mais-natural-ca60-v1/versions/design-v5/design-registration.json" with { type: "json" };
import ATTEMPT_RECEIPT_SCHEMA from "../../research/mais-natural-ca60-v1/versions/design-v5/schemas/ProviderAttemptReceiptV2.schema.json" with { type: "json" };
import LOGICAL_REQUEST_SCHEMA from "../../research/mais-natural-ca60-v1/versions/design-v5/schemas/ProviderLogicalRequestV2.schema.json" with { type: "json" };
import ROLE_OUTPUT_SCHEMA from "../../research/mais-natural-ca60-v1/versions/design-v5/schemas/OpenAIReferenceRoleOutputV1.schema.json" with { type: "json" };
import WIRE_EVIDENCE_SCHEMA from "../../research/mais-natural-ca60-v1/versions/design-v5/schemas/ProviderWireEvidenceV2.schema.json" with { type: "json" };
import {
  canonicalJson,
  jcsHash,
} from "../../research/mais-natural-ca60-v1/versions/design-v5/design-contract.mjs";

const DESIGN_ID = "MAIS-NATURAL-CA60-V5";
const PROVIDER = "OPENAI_DIRECT";
const MODEL = "gpt-5.6-luna";
const ENDPOINT = "https://us.api.openai.com/v1/responses";
const PROJECT_RESIDENCY = "US_STORAGE_PROCESSING";
const API_SURFACE = "RESPONSES_API_V1";
const SHA256 = /^[0-9a-f]{64}$/u;
const ROLE_ORDER = Object.freeze(["A_SOLVE", "A_LABEL", "B_SOLVE", "B_LABEL", "ADJUDICATOR"]);
const ROLE_SET = new Set(ROLE_ORDER);
const ROLE_CONTRACTS = DESIGN_REGISTRATION.providerControls.openaiReferenceRoleContractCatalog.roles;
const ENVELOPE = DESIGN_REGISTRATION.providerControls.openaiReferenceEnvelope;
const RESPONSE_HEADER_ALLOWLIST = new Set(["content-type", "date", "openai-processing-ms", "x-request-id"]);
const REQUEST_HEADER_NAME_ALLOWLIST = Object.freeze(["authorization", "content-type", "openai-project"]);

const LOGICAL_REQUEST_FIELDS = Object.freeze([
  "schemaVersion",
  "provider",
  "role",
  "endpoint",
  "projectResidency",
  "model",
  "systemPrompt",
  "inputPayload",
  "responseSchema",
  "responseSchemaLiteral",
  "responseSchemaHash",
  "logicalRequestTemplateHash",
  "wireRequestTemplateHash",
  "requestedSeed",
  "previousResponseId",
  "conversation",
  "adapterTransformVersion",
  "adapterTransformHash",
  "logicalRequestHash",
]);

const ATTEMPT_INPUT_FIELDS = Object.freeze([
  "runId",
  "registrationHash",
  "frameRegistrationHash",
  "sampleManifestHash",
  "authorizationHash",
  "referenceSealHash",
  "executionRegistrationHash",
  "itemIdPseudonym",
  "itemHash",
  "clusterId",
  "role",
  "attemptId",
  "requestedProvider",
  "observedProvider",
  "requestedModel",
  "observedModel",
  "requestedEndpoint",
  "observedEndpoint",
  "projectResidency",
  "responseId",
  "providerRequestId",
  "requestBodyHash",
  "responseBodyHash",
  "parsedOutputHash",
  "logicalRequestHash",
  "wireRequestBodyHash",
  "reasoningContextRequested",
  "reasoningContextObserved",
  "storeRequested",
  "backgroundRequested",
  "startedAt",
  "finishedAt",
  "latencyMs",
  "httpStatus",
  "finishReason",
  "parseStatus",
  "schemaStatus",
  "attemptStatus",
  "inputTokens",
  "outputTokens",
  "reasoningTokens",
  "totalTokens",
  "costRateSnapshotHash",
  "estimatedCost",
  "cumulativeCost",
  "retryClassification",
  "redactedError",
]);

export const OPENAI_REFERENCE_ADAPTER_TRANSFORM_VERSION_V5 = "OPENAI_RESPONSES_LOGICAL_TO_WIRE_V5_1";
export const OPENAI_REFERENCE_ADAPTER_TRANSFORM_HASH_V5 = jcsHash({
  version: OPENAI_REFERENCE_ADAPTER_TRANSFORM_VERSION_V5,
  inputEncoding: "UTF8_JCS_ROLE_BOUND_INERT_DATA_V1",
  outputSelection: "EXACTLY_ONE_ASSISTANT_OUTPUT_TEXT_V1",
  structuredValidation: "FROZEN_ROLE_JSON_SCHEMA_V1",
  requestHeaderHandling: "HEADER_NAMES_ONLY_NO_VALUES_V1",
  providerNetworkPrimitive: null,
});

function plainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function codePointCompare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function exactFields(value, fields) {
  return plainObject(value)
    && canonicalJson(Object.keys(value).sort(codePointCompare)) === canonicalJson([...fields].sort(codePointCompare));
}

function add(errors, message) {
  if (typeof message === "string" && message.length > 0 && !errors.includes(message)) errors.push(message);
}

function hashWithout(value, field) {
  const copy = deepClone(value);
  delete copy[field];
  return jcsHash(copy);
}

function validDateTime(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function validUri(value) {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function valueEquals(left, right) {
  try {
    return canonicalJson(left) === canonicalJson(right);
  } catch {
    return Object.is(left, right);
  }
}

function validateJsonSchema(value, schema, at = "$") {
  const errors = [];
  if (!plainObject(schema)) return [`${at}: schema is not an object`];

  if (Array.isArray(schema.anyOf)) {
    if (!schema.anyOf.some((candidate) => validateJsonSchema(value, candidate, at).length === 0)) {
      errors.push(`${at}: no anyOf branch matched`);
    }
    return errors;
  }
  if (Object.hasOwn(schema, "const") && !valueEquals(value, schema.const)) errors.push(`${at}: const mismatch`);
  if (Array.isArray(schema.enum) && !schema.enum.some((candidate) => valueEquals(value, candidate))) {
    errors.push(`${at}: value is outside enum`);
  }

  if (schema.type === "null" && value !== null) errors.push(`${at}: expected null`);
  if (schema.type === "boolean" && typeof value !== "boolean") errors.push(`${at}: expected boolean`);
  if (schema.type === "string") {
    if (typeof value !== "string") errors.push(`${at}: expected string`);
    else {
      if (Number.isSafeInteger(schema.minLength) && value.length < schema.minLength) errors.push(`${at}: string is too short`);
      if (typeof schema.pattern === "string" && !(new RegExp(schema.pattern, "u")).test(value)) errors.push(`${at}: pattern mismatch`);
      if (schema.format === "date-time" && !validDateTime(value)) errors.push(`${at}: invalid date-time`);
      if (schema.format === "uri" && !validUri(value)) errors.push(`${at}: invalid URI`);
    }
  }
  if (schema.type === "integer") {
    if (!Number.isSafeInteger(value)) errors.push(`${at}: expected safe integer`);
    else {
      if (Number.isFinite(schema.minimum) && value < schema.minimum) errors.push(`${at}: below minimum`);
      if (Number.isFinite(schema.maximum) && value > schema.maximum) errors.push(`${at}: above maximum`);
    }
  }
  if (schema.type === "number") {
    if (typeof value !== "number" || !Number.isFinite(value)) errors.push(`${at}: expected finite number`);
    else {
      if (Number.isFinite(schema.minimum) && value < schema.minimum) errors.push(`${at}: below minimum`);
      if (Number.isFinite(schema.exclusiveMinimum) && value <= schema.exclusiveMinimum) errors.push(`${at}: below exclusive minimum`);
      if (Number.isFinite(schema.maximum) && value > schema.maximum) errors.push(`${at}: above maximum`);
    }
  }
  if (schema.type === "array") {
    if (!Array.isArray(value)) errors.push(`${at}: expected array`);
    else {
      if (Number.isSafeInteger(schema.minItems) && value.length < schema.minItems) errors.push(`${at}: array is too short`);
      if (Number.isSafeInteger(schema.maxItems) && value.length > schema.maxItems) errors.push(`${at}: array is too long`);
      if (schema.uniqueItems === true) {
        const encoded = value.map((entry) => canonicalJson(entry));
        if (new Set(encoded).size !== encoded.length) errors.push(`${at}: array items are not unique`);
      }
      if (plainObject(schema.items)) {
        value.forEach((entry, index) => errors.push(...validateJsonSchema(entry, schema.items, `${at}[${index}]`)));
      }
    }
  }
  if (schema.type === "object") {
    if (!plainObject(value)) errors.push(`${at}: expected object`);
    else {
      if (Number.isSafeInteger(schema.minProperties) && Object.keys(value).length < schema.minProperties) {
        errors.push(`${at}: object has too few properties`);
      }
      if (Array.isArray(schema.required)) {
        for (const key of schema.required) {
          if (!Object.hasOwn(value, key)) errors.push(`${at}.${key}: required property is missing`);
        }
      }
      for (const [key, child] of Object.entries(value)) {
        if (plainObject(schema.propertyNames)) errors.push(...validateJsonSchema(key, schema.propertyNames, `${at}{propertyName}`));
        if (plainObject(schema.properties?.[key])) {
          errors.push(...validateJsonSchema(child, schema.properties[key], `${at}.${key}`));
        } else if (schema.additionalProperties === false) {
          errors.push(`${at}.${key}: additional property is forbidden`);
        } else if (plainObject(schema.additionalProperties)) {
          errors.push(...validateJsonSchema(child, schema.additionalProperties, `${at}.${key}`));
        }
      }
    }
  }
  return errors;
}

function roleContract(role) {
  if (!ROLE_SET.has(role) || !plainObject(ROLE_CONTRACTS[role])) throw new Error(`unsupported OpenAI reference role: ${String(role)}`);
  return ROLE_CONTRACTS[role];
}

function validateProviderInput(role, providerInput) {
  const contract = roleContract(role);
  if (!exactFields(providerInput, contract.inputFieldNames)) {
    return [`${role} provider input fields differ from the frozen role allowlist`];
  }
  try {
    canonicalJson(providerInput);
  } catch (error) {
    return [`${role} provider input is not canonical-JSON-safe: ${error instanceof Error ? error.message : "unknown"}`];
  }
  return [];
}

export function sha256Bytes(value) {
  if (typeof value === "string") return createHash("sha256").update(Buffer.from(value, "utf8")).digest("hex");
  if (value instanceof Uint8Array) return createHash("sha256").update(value).digest("hex");
  throw new TypeError("byte hashing accepts only a UTF-8 string or Uint8Array");
}

export function buildOpenAIReferenceLogicalRequestV5({ role, providerInput }) {
  const contract = roleContract(role);
  const inputErrors = validateProviderInput(role, providerInput);
  if (inputErrors.length > 0) throw new Error(inputErrors.join("; "));
  const responseSchema = JSON.parse(contract.schemaLiteral);
  const body = {
    schemaVersion: "ProviderLogicalRequestV2",
    provider: PROVIDER,
    role,
    endpoint: ENDPOINT,
    projectResidency: PROJECT_RESIDENCY,
    model: MODEL,
    systemPrompt: contract.promptLiteral,
    inputPayload: deepClone(providerInput),
    responseSchema,
    responseSchemaLiteral: contract.schemaLiteral,
    responseSchemaHash: contract.schemaHash,
    logicalRequestTemplateHash: ENVELOPE.logicalRequestTemplateHash,
    wireRequestTemplateHash: ENVELOPE.wireRequestTemplateHash,
    requestedSeed: null,
    previousResponseId: null,
    conversation: null,
    adapterTransformVersion: OPENAI_REFERENCE_ADAPTER_TRANSFORM_VERSION_V5,
    adapterTransformHash: OPENAI_REFERENCE_ADAPTER_TRANSFORM_HASH_V5,
  };
  const logicalRequest = { ...body, logicalRequestHash: jcsHash(body) };
  const errors = validateProviderLogicalRequestV2(logicalRequest);
  if (errors.length > 0) throw new Error(`logical request construction failed: ${errors.join("; ")}`);
  return Object.freeze(logicalRequest);
}

export function validateProviderLogicalRequestV2(request) {
  const errors = validateJsonSchema(request, LOGICAL_REQUEST_SCHEMA);
  if (!exactFields(request, LOGICAL_REQUEST_FIELDS)) add(errors, "logical request fields are not the exact V2 shape");
  if (!plainObject(request)) return [...new Set(errors)];
  if (request.provider !== PROVIDER || request.endpoint !== ENDPOINT
    || request.projectResidency !== PROJECT_RESIDENCY || request.model !== MODEL) {
    add(errors, "logical request provider tuple mismatch");
  }
  let contract;
  try {
    contract = roleContract(request.role);
    validateProviderInput(request.role, request.inputPayload).forEach((error) => add(errors, error));
  } catch (error) {
    add(errors, error instanceof Error ? error.message : "logical request role invalid");
  }
  if (contract) {
    if (request.systemPrompt !== contract.promptLiteral) add(errors, "logical request system prompt drift");
    if (request.responseSchemaLiteral !== contract.schemaLiteral
      || request.responseSchemaHash !== contract.schemaHash
      || jcsHash(request.responseSchema) !== contract.schemaHash) {
      add(errors, "logical request response schema drift");
    }
  }
  if (request.logicalRequestTemplateHash !== ENVELOPE.logicalRequestTemplateHash
    || request.wireRequestTemplateHash !== ENVELOPE.wireRequestTemplateHash) {
    add(errors, "logical or wire request template hash drift");
  }
  if (request.requestedSeed !== null || request.previousResponseId !== null || request.conversation !== null) {
    add(errors, "logical request determinism/null-context contract drift");
  }
  if (request.adapterTransformVersion !== OPENAI_REFERENCE_ADAPTER_TRANSFORM_VERSION_V5
    || request.adapterTransformHash !== OPENAI_REFERENCE_ADAPTER_TRANSFORM_HASH_V5) {
    add(errors, "logical request adapter transform drift");
  }
  if (!SHA256.test(request.logicalRequestHash ?? "") || hashWithout(request, "logicalRequestHash") !== request.logicalRequestHash) {
    add(errors, "logical request self hash mismatch");
  }
  return [...new Set(errors)];
}

function responseFormatName(role) {
  return `mais_natural_ca60_v5_${role.toLowerCase()}`;
}

function roleInputText(logicalRequest) {
  return canonicalJson({
    schemaVersion: "NaturalCaReferenceRoleInputV1",
    role: logicalRequest.role,
    payload: logicalRequest.inputPayload,
  });
}

function projectWireRequest(logicalRequest) {
  return {
    model: MODEL,
    stream: false,
    store: false,
    background: false,
    reasoning: { effort: "high", context: "current_turn" },
    text: {
      verbosity: "medium",
      format: {
        type: "json_schema",
        name: responseFormatName(logicalRequest.role),
        strict: true,
        schema: deepClone(logicalRequest.responseSchema),
      },
    },
    max_output_tokens: 8192,
    tools: [],
    instructions: logicalRequest.systemPrompt,
    input: [{
      role: "user",
      content: [{ type: "input_text", text: roleInputText(logicalRequest) }],
    }],
  };
}

export function buildOpenAIReferenceWireRequestV5(logicalRequest) {
  const logicalErrors = validateProviderLogicalRequestV2(logicalRequest);
  if (logicalErrors.length > 0) throw new Error(`invalid logical request: ${logicalErrors.join("; ")}`);
  const wire = projectWireRequest(logicalRequest);
  const errors = validateOpenAIReferenceWireRequestV5(wire, logicalRequest);
  if (errors.length > 0) throw new Error(`wire request construction failed: ${errors.join("; ")}`);
  return Object.freeze(wire);
}

export function validateOpenAIReferenceWireRequestV5(wireRequest, logicalRequest) {
  const errors = validateProviderLogicalRequestV2(logicalRequest).map((error) => `logical request: ${error}`);
  if (!plainObject(wireRequest)) return [...errors, "wire request is missing"];
  const expected = projectWireRequest(logicalRequest);
  if (canonicalJson(wireRequest) !== canonicalJson(expected)) add(errors, "wire request differs from the frozen logical-to-wire projection");
  for (const forbidden of ["previous_response_id", "conversation", "requestedSeed", "seed", "temperature", "max_tokens"]) {
    if (Object.hasOwn(wireRequest, forbidden)) add(errors, `wire request contains forbidden field ${forbidden}`);
  }
  if (wireRequest.model !== MODEL || wireRequest.store !== false || wireRequest.background !== false
    || wireRequest.stream !== false || wireRequest.reasoning?.context !== "current_turn") {
    add(errors, "wire request OpenAI Responses tuple or privacy controls drifted");
  }
  return [...new Set(errors)];
}

function sanitizeResponseHeaders(responseHeaders) {
  if (!plainObject(responseHeaders)) throw new Error("response headers must be a plain object");
  const sanitized = {};
  for (const [rawName, value] of Object.entries(responseHeaders)) {
    const name = rawName.toLowerCase();
    if (!RESPONSE_HEADER_ALLOWLIST.has(name)) throw new Error(`response header is outside the frozen allowlist: ${name}`);
    if (typeof value !== "string" || value.length === 0) throw new Error(`response header value is invalid: ${name}`);
    sanitized[name] = value;
  }
  return Object.fromEntries(Object.entries(sanitized).sort(([left], [right]) => codePointCompare(left, right)));
}

function buildProviderWireEvidenceV2({
  logicalRequest,
  wireRequest,
  rawResponseBody,
  responseEnvelope,
  responseHeaders,
  observedReasoningContext,
}) {
  const sanitizedHeaders = sanitizeResponseHeaders(responseHeaders);
  const body = {
    schemaVersion: "ProviderWireEvidenceV2",
    provider: PROVIDER,
    endpoint: ENDPOINT,
    method: "POST",
    model: MODEL,
    projectResidency: PROJECT_RESIDENCY,
    logicalRequestHash: logicalRequest.logicalRequestHash,
    requestHeadersAllowlistHash: jcsHash(REQUEST_HEADER_NAME_ALLOWLIST),
    requestBodyHash: jcsHash(wireRequest),
    responseHeadersAllowlistHash: jcsHash(sanitizedHeaders),
    rawResponseBodyHash: sha256Bytes(rawResponseBody),
    parsedEnvelopeHash: jcsHash(responseEnvelope),
    responseId: responseEnvelope.id,
    observedModel: responseEnvelope.model,
    observedReasoningContext,
  };
  return Object.freeze({ ...body, wireEvidenceHash: jcsHash(body) });
}

export function validateProviderWireEvidenceV2(evidence, expected = {}) {
  const errors = validateJsonSchema(evidence, WIRE_EVIDENCE_SCHEMA);
  if (!plainObject(evidence)) return [...new Set(errors)];
  if (evidence.provider !== PROVIDER || evidence.endpoint !== ENDPOINT || evidence.method !== "POST"
    || evidence.model !== MODEL || evidence.projectResidency !== PROJECT_RESIDENCY) {
    add(errors, "wire evidence provider tuple mismatch");
  }
  if (evidence.requestHeadersAllowlistHash !== jcsHash(REQUEST_HEADER_NAME_ALLOWLIST)) {
    add(errors, "wire evidence request header allowlist hash mismatch");
  }
  if (evidence.observedModel !== MODEL) add(errors, "wire evidence observed model mismatch");
  if (![null, "current_turn"].includes(evidence.observedReasoningContext)) add(errors, "wire evidence reasoning context mismatch");
  if (!SHA256.test(evidence.wireEvidenceHash ?? "") || hashWithout(evidence, "wireEvidenceHash") !== evidence.wireEvidenceHash) {
    add(errors, "wire evidence self hash mismatch");
  }
  if (plainObject(expected.logicalRequest)) {
    if (evidence.logicalRequestHash !== expected.logicalRequest.logicalRequestHash) add(errors, "wire evidence logical request hash mismatch");
  }
  if (plainObject(expected.wireRequest) && evidence.requestBodyHash !== jcsHash(expected.wireRequest)) {
    add(errors, "wire evidence request body hash mismatch");
  }
  return [...new Set(errors)];
}

function parseUsage(usage) {
  if (!plainObject(usage)) throw new Error("OpenAI response usage is missing");
  const inputTokens = usage.input_tokens;
  const outputTokens = usage.output_tokens;
  const reasoningTokens = usage.output_tokens_details?.reasoning_tokens ?? 0;
  const totalTokens = usage.total_tokens;
  for (const [name, value] of Object.entries({ inputTokens, outputTokens, reasoningTokens, totalTokens })) {
    if (!Number.isSafeInteger(value) || value < 0) throw new Error(`OpenAI response usage ${name} is invalid`);
  }
  if (inputTokens + outputTokens !== totalTokens) throw new Error("OpenAI response usage total is inconsistent");
  if (reasoningTokens > outputTokens) throw new Error("OpenAI response reasoning usage exceeds output usage");
  return Object.freeze({ inputTokens, outputTokens, reasoningTokens, totalTokens });
}

function exactlyOneOutputText(responseEnvelope) {
  if (!Array.isArray(responseEnvelope.output)) throw new Error("OpenAI response output array is missing");
  const leaves = [];
  for (const item of responseEnvelope.output) {
    if (!plainObject(item)) throw new Error("OpenAI response output item is invalid");
    if (item.type === "reasoning") continue;
    if (item.type !== "message" || item.role !== "assistant" || item.status !== "completed" || !Array.isArray(item.content)) {
      throw new Error("OpenAI response contains an unexpected non-reasoning output item");
    }
    for (const content of item.content) {
      if (plainObject(content) && content.type === "output_text" && typeof content.text === "string") leaves.push(content.text);
      else throw new Error("OpenAI response assistant content is not output_text");
    }
  }
  if (leaves.length !== 1) throw new Error("OpenAI response must contain exactly one assistant output_text leaf");
  return leaves[0];
}

export function parseOpenAIReferenceFixtureResponseV5({
  role,
  logicalRequest,
  wireRequest,
  rawResponseBody,
  responseEnvelope,
  responseHeaders = {},
}) {
  roleContract(role);
  if (logicalRequest?.role !== role) throw new Error("response role differs from logical request role");
  const wireErrors = validateOpenAIReferenceWireRequestV5(wireRequest, logicalRequest);
  if (wireErrors.length > 0) throw new Error(`response parse input is invalid: ${wireErrors.join("; ")}`);
  if (!(typeof rawResponseBody === "string" || rawResponseBody instanceof Uint8Array)) throw new Error("raw response bytes are required");
  if (!plainObject(responseEnvelope)) throw new Error("OpenAI response envelope is missing");
  let rawParsed;
  try {
    rawParsed = JSON.parse(typeof rawResponseBody === "string" ? rawResponseBody : Buffer.from(rawResponseBody).toString("utf8"));
  } catch {
    throw new Error("raw OpenAI response body is not valid JSON");
  }
  if (canonicalJson(rawParsed) !== canonicalJson(responseEnvelope)) throw new Error("raw response bytes and parsed envelope differ");
  if (responseEnvelope.object !== "response" || responseEnvelope.status !== "completed") throw new Error("OpenAI response did not complete");
  if (typeof responseEnvelope.id !== "string" || responseEnvelope.id.length === 0) throw new Error("OpenAI response ID is missing");
  if (responseEnvelope.model !== MODEL) throw new Error("OpenAI observed model mismatch");
  const observedReasoningContext = responseEnvelope.reasoning?.context ?? null;
  if (![null, "current_turn"].includes(observedReasoningContext)) throw new Error("OpenAI observed reasoning context mismatch");
  if (responseEnvelope.reasoning?.effort !== undefined && responseEnvelope.reasoning.effort !== "high") {
    throw new Error("OpenAI observed reasoning effort mismatch");
  }
  const outputText = exactlyOneOutputText(responseEnvelope);
  let structuredPayload;
  try {
    structuredPayload = JSON.parse(outputText);
  } catch {
    throw new Error("OpenAI output_text is not valid JSON");
  }
  const schemaErrors = validateJsonSchema(structuredPayload, logicalRequest.responseSchema);
  if (schemaErrors.length > 0) throw new Error(`OpenAI structured output schema failure: ${schemaErrors.join("; ")}`);
  const usage = parseUsage(responseEnvelope.usage);
  const wireEvidence = buildProviderWireEvidenceV2({
    logicalRequest,
    wireRequest,
    rawResponseBody,
    responseEnvelope,
    responseHeaders,
    observedReasoningContext,
  });
  const evidenceErrors = validateProviderWireEvidenceV2(wireEvidence, { logicalRequest, wireRequest });
  if (evidenceErrors.length > 0) throw new Error(`wire evidence construction failed: ${evidenceErrors.join("; ")}`);
  const body = {
    schemaVersion: "OpenAIReferenceFixtureParseV1",
    fixtureOnly: true,
    providerEventCount: 0,
    role,
    requestedProvider: PROVIDER,
    observedProvider: PROVIDER,
    requestedModel: MODEL,
    observedModel: responseEnvelope.model,
    responseId: responseEnvelope.id,
    observedReasoningContext,
    attemptReasoningContextObserved: observedReasoningContext ?? "UNOBSERVED",
    parseStatus: "PARSED",
    schemaStatus: "VALID",
    structuredPayload,
    structuredPayloadHash: jcsHash(structuredPayload),
    usage,
    wireEvidence,
  };
  return Object.freeze({ ...body, fixtureParseHash: jcsHash(body) });
}

export function parseOpenAIReferenceLiveResponseV5R2(input) {
  const fixture = parseOpenAIReferenceFixtureResponseV5(input);
  const { fixtureParseHash: _fixtureParseHash, ...shared } = fixture;
  const body = {
    ...shared,
    schemaVersion: "OpenAIReferenceLiveParseV1",
    fixtureOnly: false,
    providerEventCount: 1,
  };
  return Object.freeze({ ...body, liveParseHash: jcsHash(body) });
}

export function buildProviderAttemptPayloadV2(input) {
  if (!exactFields(input, ATTEMPT_INPUT_FIELDS)) throw new Error("ProviderAttemptReceiptV2 input fields are invalid");
  const payload = {
    schemaVersion: "ProviderAttemptReceiptV2",
    designId: DESIGN_ID,
    ...deepClone(input),
    appendOnly: true,
    atomicWrite: true,
    fileMode: "0600",
    cacheHit: false,
    providerInvoiceAuthoritative: true,
  };
  const provisionalBody = { ...payload, sequenceNumber: 1, previousReceiptHash: null };
  const provisional = { ...provisionalBody, selfHash: jcsHash(provisionalBody) };
  const errors = validateProviderAttemptReceiptV2(provisional);
  if (errors.length > 0) throw new Error(`ProviderAttemptReceiptV2 payload is invalid: ${errors.join("; ")}`);
  return Object.freeze(payload);
}

export function validateProviderAttemptReceiptV2(receipt) {
  const errors = validateJsonSchema(receipt, ATTEMPT_RECEIPT_SCHEMA);
  if (!plainObject(receipt)) return [...new Set(errors)];
  if (receipt.designId !== DESIGN_ID || receipt.registrationHash !== DESIGN_REGISTRATION.registrationHash) {
    add(errors, "provider attempt design or registration mismatch");
  }
  if (!ROLE_SET.has(receipt.role)) add(errors, "provider attempt role is outside the OpenAI reference panel");
  if (receipt.requestedProvider !== PROVIDER || receipt.requestedModel !== MODEL
    || receipt.requestedEndpoint !== ENDPOINT || receipt.projectResidency !== PROJECT_RESIDENCY) {
    add(errors, "provider attempt requested tuple mismatch");
  }
  if (receipt.attemptStatus === "SUCCEEDED") {
    if (receipt.observedProvider !== PROVIDER || receipt.observedModel !== MODEL || receipt.observedEndpoint !== ENDPOINT) {
      add(errors, "provider attempt observed model/provider/endpoint mismatch");
    }
    if (!Number.isSafeInteger(receipt.httpStatus) || receipt.httpStatus < 200 || receipt.httpStatus > 299) add(errors, "successful provider attempt HTTP status invalid");
    if (receipt.parseStatus !== "PARSED" || receipt.schemaStatus !== "VALID") add(errors, "successful provider attempt parse/schema status invalid");
    if (receipt.finishReason !== "completed") add(errors, "successful provider attempt finish reason invalid");
    if (receipt.redactedError !== null) add(errors, "successful provider attempt must not carry an error");
    for (const field of ["responseId", "requestBodyHash", "responseBodyHash", "parsedOutputHash", "wireRequestBodyHash"]) {
      if (receipt[field] === null) add(errors, `successful provider attempt ${field} is missing`);
    }
  }
  if (receipt.referenceSealHash !== null || receipt.executionRegistrationHash !== null) {
    add(errors, "OpenAI reference attempt must precede reference seal and DeepSeek execution registration");
  }
  if (receipt.reasoningContextRequested !== "current_turn"
    || !["current_turn", "UNOBSERVED"].includes(receipt.reasoningContextObserved)) {
    add(errors, "provider attempt reasoning context contract mismatch");
  }
  if (receipt.storeRequested !== false || receipt.backgroundRequested !== false || receipt.cacheHit !== false) {
    add(errors, "provider attempt privacy/cache controls mismatch");
  }
  if (receipt.requestBodyHash !== receipt.wireRequestBodyHash) add(errors, "provider attempt request and wire body hashes differ");
  if (Number.isSafeInteger(receipt.inputTokens) && Number.isSafeInteger(receipt.outputTokens)
    && receipt.inputTokens + receipt.outputTokens !== receipt.totalTokens) {
    add(errors, "provider attempt token total is inconsistent");
  }
  if (Number.isSafeInteger(receipt.reasoningTokens) && Number.isSafeInteger(receipt.outputTokens)
    && receipt.reasoningTokens > receipt.outputTokens) {
    add(errors, "provider attempt reasoning tokens exceed output tokens");
  }
  if (validDateTime(receipt.startedAt) && validDateTime(receipt.finishedAt) && Number.isSafeInteger(receipt.latencyMs)) {
    if (Date.parse(receipt.finishedAt) - Date.parse(receipt.startedAt) !== receipt.latencyMs) add(errors, "provider attempt latency does not match timestamps");
  }
  if (typeof receipt.estimatedCost === "number" && typeof receipt.cumulativeCost === "number"
    && receipt.cumulativeCost < receipt.estimatedCost) {
    add(errors, "provider attempt cumulative cost is below attempt cost");
  }
  if (!SHA256.test(receipt.selfHash ?? "") || hashWithout(receipt, "selfHash") !== receipt.selfHash) {
    add(errors, "provider attempt self hash mismatch");
  }
  return [...new Set(errors)];
}

export function buildOpenAIReferenceRoleOutputV1({ attemptReceipt, logicalRequest, structuredPayload }) {
  const logicalErrors = validateProviderLogicalRequestV2(logicalRequest);
  if (logicalErrors.length > 0) throw new Error(`role output logical request invalid: ${logicalErrors.join("; ")}`);
  const attemptErrors = validateProviderAttemptReceiptV2(attemptReceipt);
  if (attemptErrors.length > 0
    || attemptReceipt.role !== logicalRequest.role
    || attemptReceipt.logicalRequestHash !== logicalRequest.logicalRequestHash) {
    throw new Error("role output attempt receipt binding is invalid");
  }
  const schemaErrors = validateJsonSchema(structuredPayload, logicalRequest.responseSchema);
  if (schemaErrors.length > 0) throw new Error(`role output structured payload schema failure: ${schemaErrors.join("; ")}`);
  const structuredPayloadHash = jcsHash(structuredPayload);
  if (attemptReceipt.parsedOutputHash !== structuredPayloadHash) throw new Error("role output parsed payload hash differs from attempt receipt");
  const contract = roleContract(logicalRequest.role);
  const body = {
    schemaVersion: "OpenAIReferenceRoleOutputV1",
    designId: DESIGN_ID,
    registrationHash: DESIGN_REGISTRATION.registrationHash,
    itemIdPseudonym: attemptReceipt.itemIdPseudonym,
    itemHash: attemptReceipt.itemHash,
    role: logicalRequest.role,
    provider: PROVIDER,
    requestedModel: MODEL,
    observedModel: attemptReceipt.observedModel,
    responseId: attemptReceipt.responseId,
    attemptReceiptHash: attemptReceipt.selfHash,
    promptHash: contract.promptHash,
    responseSchemaHash: contract.schemaHash,
    structuredPayload: deepClone(structuredPayload),
    structuredPayloadHash,
  };
  const output = { ...body, selfHash: jcsHash(body) };
  const errors = validateOpenAIReferenceRoleOutputV1(output);
  if (errors.length > 0) throw new Error(`role output construction failed: ${errors.join("; ")}`);
  return Object.freeze(output);
}

export function validateOpenAIReferenceRoleOutputV1(output) {
  const errors = validateJsonSchema(output, ROLE_OUTPUT_SCHEMA);
  if (!plainObject(output)) return [...new Set(errors)];
  if (output.designId !== DESIGN_ID || output.registrationHash !== DESIGN_REGISTRATION.registrationHash
    || output.provider !== PROVIDER || output.requestedModel !== MODEL || output.observedModel !== MODEL) {
    add(errors, "OpenAI reference role output design or provider/model tuple mismatch");
  }
  let contract;
  try {
    contract = roleContract(output.role);
  } catch (error) {
    add(errors, error instanceof Error ? error.message : "role output role invalid");
  }
  if (contract) {
    if (output.promptHash !== contract.promptHash || output.responseSchemaHash !== contract.schemaHash) {
      add(errors, "OpenAI reference role output prompt or schema hash mismatch");
    }
    validateJsonSchema(output.structuredPayload, JSON.parse(contract.schemaLiteral))
      .forEach((error) => add(errors, `structured payload: ${error}`));
  }
  if (output.structuredPayloadHash !== jcsHash(output.structuredPayload)) add(errors, "role output structured payload hash mismatch");
  if (!SHA256.test(output.selfHash ?? "") || hashWithout(output, "selfHash") !== output.selfHash) add(errors, "role output self hash mismatch");
  return [...new Set(errors)];
}

export const OPENAI_REFERENCE_V5_CONSTANTS = Object.freeze({
  designId: DESIGN_ID,
  registrationHash: DESIGN_REGISTRATION.registrationHash,
  provider: PROVIDER,
  model: MODEL,
  endpoint: ENDPOINT,
  projectResidency: PROJECT_RESIDENCY,
  apiSurface: API_SURFACE,
  roles: ROLE_ORDER,
  requestHeaderNameAllowlist: REQUEST_HEADER_NAME_ALLOWLIST,
});
