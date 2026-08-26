import path from "node:path";

import DESIGN from "../../research/mais-natural-ca60-v1/versions/design-v5/design-registration.json" with { type: "json" };

import RAW_SCHEMA from "./schemas/ProviderRawResponseArtifactV1.schema.json" with { type: "json" };
import BINDING_SCHEMA from "./schemas/ProviderRawResponseBindingReceiptV1.schema.json" with { type: "json" };
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
import {
  parseOpenAIReferenceLiveResponseV5R2,
} from "./openai-reference-adapter-v5.mjs";
import {
  parseDeepSeekEvaluationResponseV5R2,
} from "./deepseek-evaluation-adapter-v5-r2.mjs";

const MAX_BYTES = 16 * 1024 * 1024;
const PARSER_IMPLEMENTATION_HASH = sha256V5R3("MAIS_NATURAL_CA60_V5_R6_RAW_REPARSE_OPENAI_AND_DEEPSEEK_V1");

function requireCondition(condition, message) {
  if (!condition) throw new TypeError(message);
}

function buildRawArtifact(input) {
  const body = input.rawResponseBody ?? null;
  requireCondition(body === null || typeof body === "string", "raw provider response body must be UTF-8 text or null");
  const bytes = body === null ? Buffer.alloc(0) : Buffer.from(body, "utf8");
  requireCondition(bytes.byteLength <= MAX_BYTES, "raw provider response exceeds the frozen byte cap");
  requireCondition((input.bodyReadStatus === "COMPLETE") === (body !== null),
    "raw response body availability differs from the transport body-read status");
  const artifact = sealV5R3Artifact({
    schemaVersion: "ProviderRawResponseArtifactV1",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash: input.activeRunnerRegistrationHash,
    authorizationHash: input.authorizationHash,
    requestArtifactHash: input.requestArtifactHash,
    reservationHash: input.reservationHash,
    dispatchAuditHash: input.dispatchAuditHash,
    attemptId: input.attemptId,
    provider: input.provider,
    role: input.role,
    itemHash: input.itemHash,
    transportStatus: input.transportStatus,
    bodyReadStatus: input.bodyReadStatus,
    httpStatus: input.httpStatus ?? null,
    rawResponseEncoding: "UTF-8",
    rawResponseByteLength: bytes.byteLength,
    rawResponseBodyHash: body === null ? null : sha256V5R3(bytes),
    rawResponseBody: body,
    capturedAt: input.capturedAt,
  });
  assertClosedSelfHashedAgainstV5R5(artifact, RAW_SCHEMA, artifact.schemaVersion);
  return artifact;
}

async function writeContentAddressed({ trustedRoot, family, artifact }) {
  const relativePath = path.join("raw-provider-custody-v5-r6", family, `${artifact.selfHash}.json`);
  try {
    const existing = await readProtectedJsonV5R4({ trustedRoot, relativePath });
    requireCondition(canonicalJsonV5R3(existing) === canonicalJsonV5R3(artifact),
      "raw-response content-addressed path already contains different bytes");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    await atomicWriteProtectedJsonV5R4({ trustedRoot, relativePath, value: artifact });
  }
  return { relativePath, absolutePath: path.join(trustedRoot.root, relativePath) };
}

export async function createRawResponseCustodyStoreV5R6({ protectedRoot }) {
  const trustedRoot = await establishProtectedRootV5R4(protectedRoot);
  return Object.freeze({
    async persist(input) {
      const artifact = buildRawArtifact(input);
      const location = await writeContentAddressed({ trustedRoot, family: input.provider.toLowerCase(), artifact });
      return Object.freeze({ artifact, ...location, persistedBeforeCompletion: true });
    },
    async persistBinding(binding) {
      assertClosedSelfHashedAgainstV5R5(binding, BINDING_SCHEMA, binding.schemaVersion);
      const location = await writeContentAddressed({ trustedRoot, family: "bindings", artifact: binding });
      return Object.freeze({ binding, ...location, persistedBeforeCompletion: true });
    },
  });
}

export function validateRawResponseArtifactV5R6(artifact) {
  const errors = [...validateClosedSelfHashedAgainstV5R5(artifact, RAW_SCHEMA)];
  const bytes = artifact?.rawResponseBody === null ? Buffer.alloc(0) : Buffer.from(artifact?.rawResponseBody ?? "", "utf8");
  if (artifact?.rawResponseByteLength !== bytes.byteLength) errors.push("raw response byte length differs from retained bytes");
  if (artifact?.rawResponseBodyHash !== (artifact?.rawResponseBody === null ? null : sha256V5R3(bytes))) {
    errors.push("raw response hash differs from retained bytes");
  }
  return Object.freeze([...new Set(errors)]);
}

export function independentlyReparseRawResponseV5R6({ rawResponseArtifact, requestArtifact }) {
  const errors = validateRawResponseArtifactV5R6(rawResponseArtifact);
  requireCondition(errors.length === 0, errors.join("; "));
  requireCondition(rawResponseArtifact.requestArtifactHash === requestArtifact?.selfHash
    && rawResponseArtifact.attemptId === requestArtifact?.attemptId
    && rawResponseArtifact.provider === requestArtifact?.provider
    && rawResponseArtifact.role === requestArtifact?.role
    && rawResponseArtifact.itemHash === requestArtifact?.itemHash,
  "raw response artifact does not bind the exact provider request");
  requireCondition(rawResponseArtifact.rawResponseBody !== null, "raw response body is unavailable for independent reparse");
  if (requestArtifact.provider === "OPENAI_DIRECT") {
    const responseEnvelope = JSON.parse(rawResponseArtifact.rawResponseBody);
    const parsed = parseOpenAIReferenceLiveResponseV5R2({
      role: requestArtifact.role,
      logicalRequest: requestArtifact.logicalRequest,
      wireRequest: requestArtifact.wireRequest,
      rawResponseBody: rawResponseArtifact.rawResponseBody,
      responseEnvelope,
      responseHeaders: {},
    });
    return Object.freeze({
      parsedPayload: parsed.structuredPayload,
      parsedPayloadHash: parsed.structuredPayloadHash ?? sha256V5R3(canonicalJsonV5R3(parsed.structuredPayload)),
      observedModel: parsed.observedModel,
      responseId: parsed.responseId,
      finishReason: "completed",
      usage: parsed.usage,
      parserVersion: "OPENAI_REFERENCE_RESPONSE_V5_R2_REPLAY",
      parserImplementationHash: PARSER_IMPLEMENTATION_HASH,
    });
  }
  const parsed = parseDeepSeekEvaluationResponseV5R2({
    request: {
      schemaVersion: "DeepSeekEvaluationRequestV5R2",
      designId: "MAIS-NATURAL-CA60-V5",
      registrationHash: DESIGN.registrationHash,
      provider: requestArtifact.provider,
      endpoint: requestArtifact.endpoint,
      model: requestArtifact.model,
      role: requestArtifact.role,
      logicalRequest: requestArtifact.logicalRequest,
      logicalRequestHash: requestArtifact.logicalRequestHash,
      wireRequestBody: requestArtifact.wireRequest,
      wireRequestBodyBytes: requestArtifact.wireRequestByteLength,
      wireRequestBodyHash: requestArtifact.wireRequestBodyHash,
      adapterTransformVersion: "DEEPSEEK_DIRECT_OPENAI_COMPAT_V5_R2_1",
      adapterTransformHash: requestArtifact.adapterTransformHash,
      referenceInputCount: 0,
    },
    rawResponseBody: rawResponseArtifact.rawResponseBody,
  });
  return Object.freeze({
    parsedPayload: parsed.structuredPayload,
    parsedPayloadHash: parsed.structuredPayloadHash,
    observedModel: parsed.observedModel,
    responseId: parsed.responseId,
    finishReason: parsed.finishReason,
    usage: parsed.usage,
    parserVersion: "DEEPSEEK_EVALUATION_RESPONSE_V5_R2_REPLAY",
    parserImplementationHash: PARSER_IMPLEMENTATION_HASH,
  });
}

export function buildRawResponseBindingReceiptV5R6({
  activeRunnerRegistrationHash,
  rawResponseArtifact,
  providerEventReceipt,
  roleOutput,
  requestArtifact,
  boundAt,
}) {
  const rawErrors = validateRawResponseArtifactV5R6(rawResponseArtifact);
  requireCondition(rawErrors.length === 0, rawErrors.join("; "));
  requireCondition(providerEventReceipt?.responseBodyHash === rawResponseArtifact.rawResponseBodyHash
    && providerEventReceipt?.attemptId === rawResponseArtifact.attemptId,
  "provider event receipt does not bind the retained raw response bytes");
  let replay = null;
  if (providerEventReceipt.attemptStatus === "SUCCEEDED") {
    requireCondition(roleOutput && roleOutput.attemptReceiptHash === providerEventReceipt.selfHash,
      "successful raw-response binding requires the exact role output");
    replay = independentlyReparseRawResponseV5R6({ rawResponseArtifact, requestArtifact });
    requireCondition(roleOutput.parsedPayloadHash === replay.parsedPayloadHash
      && canonicalJsonV5R3(roleOutput.parsedPayload) === canonicalJsonV5R3(replay.parsedPayload),
    "role output differs from independent raw-response reparse");
  } else {
    requireCondition(roleOutput === null, "failed provider event cannot bind a successful role output");
  }
  const binding = sealV5R3Artifact({
    schemaVersion: "ProviderRawResponseBindingReceiptV1",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash,
    attemptId: rawResponseArtifact.attemptId,
    rawResponseArtifactHash: rawResponseArtifact.selfHash,
    rawResponseBodyHash: rawResponseArtifact.rawResponseBodyHash,
    providerEventReceiptHash: providerEventReceipt.selfHash,
    roleOutputHash: roleOutput?.selfHash ?? null,
    parsedPayloadHash: replay?.parsedPayloadHash ?? null,
    parserVersion: replay?.parserVersion ?? "NOT_PARSED_FAILED_OR_UNAVAILABLE_RESPONSE",
    parserImplementationHash: PARSER_IMPLEMENTATION_HASH,
    independentReparseVerified: replay !== null,
    boundAt,
  });
  assertClosedSelfHashedAgainstV5R5(binding, BINDING_SCHEMA, binding.schemaVersion);
  return binding;
}

export function validateRawResponseBindingReceiptV5R6(binding) {
  return validateClosedSelfHashedAgainstV5R5(binding, BINDING_SCHEMA);
}

export const RAW_RESPONSE_CUSTODY_V5_R6_CONSTANTS = Object.freeze({
  maximumResponseBytes: MAX_BYTES,
  parserImplementationHash: PARSER_IMPLEMENTATION_HASH,
  rawResponseRequiredBeforeCompletion: true,
});
