import ATTEMPT_SCHEMA from "../../research/mais-natural-ca60-v1/versions/design-v5/schemas/ProviderAttemptReceiptV2.schema.json" with { type: "json" };
import DESIGN_REGISTRATION from "../../research/mais-natural-ca60-v1/versions/design-v5/design-registration.json" with { type: "json" };
import { jcsHash } from "../../research/mais-natural-ca60-v1/versions/design-v5/design-contract.mjs";
import { createAttemptReceiptStoreV1 } from "./runner-storage.mjs";

const SHA256 = /^[0-9a-f]{64}$/u;
const PROVIDER = "DEEPSEEK_DIRECT";
const MODEL = "deepseek-v4-pro";
const ENDPOINT = "https://api.deepseek.com/chat/completions";
const PROJECT_RESIDENCY = "UNKNOWN_PENDING_ROUTE_PROBE_EVIDENCE";
const ROLES = new Set([
  "B_PRIME_CRITIQUE", "B_PRIME_REVISION", "C0_PRIME_ROLE_1", "C0_PRIME_ROLE_2",
  "C0_PRIME_ROLE_3", "C0_PRIME_ROLE_4", "C0_PRIME_ROLE_5",
]);
const RETRYABLE = new Set([
  "TRANSIENT_NETWORK_FAILURE", "TIMEOUT", "HTTP_429", "HTTP_500",
  "CONNECTION_LOST_AFTER_DISPATCH", "MALFORMED_200", "SCHEMA_FAILURE",
]);
const INPUT_FIELDS = Object.freeze([
  "runId", "registrationHash", "frameRegistrationHash", "sampleManifestHash", "authorizationHash",
  "referenceSealHash", "executionRegistrationHash", "itemIdPseudonym", "itemHash", "clusterId", "role",
  "attemptId", "requestedProvider", "observedProvider", "requestedModel", "observedModel",
  "requestedEndpoint", "observedEndpoint", "projectResidency", "responseId", "providerRequestId",
  "requestBodyHash", "responseBodyHash", "parsedOutputHash", "logicalRequestHash", "wireRequestBodyHash",
  "reasoningContextRequested", "reasoningContextObserved", "storeRequested", "backgroundRequested",
  "startedAt", "finishedAt", "latencyMs", "httpStatus", "finishReason", "parseStatus", "schemaStatus",
  "attemptStatus", "inputTokens", "outputTokens", "reasoningTokens", "totalTokens", "costRateSnapshotHash",
  "estimatedCost", "cumulativeCost", "retryClassification", "redactedError",
]);
const RECEIPT_FIELDS = Object.freeze(Object.keys(ATTEMPT_SCHEMA.properties));

function plainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function add(errors, message) {
  if (!errors.includes(message)) errors.push(message);
}

function exactFields(value, fields) {
  return plainObject(value)
    && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...fields].sort());
}

function validTimestamp(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function nullableSha(value) {
  return value === null || SHA256.test(value ?? "");
}

export function validateDeepSeekProviderAttemptReceiptV2(receipt) {
  const errors = [];
  if (!exactFields(receipt, RECEIPT_FIELDS)) return ["DeepSeek ProviderAttemptReceiptV2 fields are invalid"];
  if (receipt.schemaVersion !== "ProviderAttemptReceiptV2" || receipt.designId !== "MAIS-NATURAL-CA60-V5"
    || receipt.registrationHash !== DESIGN_REGISTRATION.registrationHash) {
    add(errors, "DeepSeek receipt design or registration is invalid");
  }
  for (const field of [
    "registrationHash", "frameRegistrationHash", "sampleManifestHash", "authorizationHash",
    "referenceSealHash", "executionRegistrationHash", "itemHash", "logicalRequestHash",
    "costRateSnapshotHash", "selfHash",
  ]) {
    if (!SHA256.test(receipt[field] ?? "")) add(errors, `DeepSeek receipt ${field} is invalid or missing`);
  }
  for (const field of ["requestBodyHash", "responseBodyHash", "parsedOutputHash", "wireRequestBodyHash", "previousReceiptHash"]) {
    if (!nullableSha(receipt[field])) add(errors, `DeepSeek receipt ${field} is invalid`);
  }
  if (typeof receipt.runId !== "string" || receipt.runId.length === 0 || typeof receipt.attemptId !== "string" || receipt.attemptId.length === 0
    || typeof receipt.itemIdPseudonym !== "string" || receipt.itemIdPseudonym.length === 0
    || typeof receipt.clusterId !== "string" || receipt.clusterId.length === 0 || !ROLES.has(receipt.role)) {
    add(errors, "DeepSeek receipt run/item/attempt/role identity is invalid");
  }
  if (!Number.isSafeInteger(receipt.sequenceNumber) || receipt.sequenceNumber < 1) add(errors, "DeepSeek receipt sequence is invalid");
  if (receipt.requestedProvider !== PROVIDER || receipt.observedProvider !== PROVIDER
    || receipt.requestedModel !== MODEL || receipt.requestedEndpoint !== ENDPOINT
    || receipt.projectResidency !== PROJECT_RESIDENCY) {
    add(errors, "DeepSeek receipt requested provider/model/endpoint tuple is invalid");
  }
  if (receipt.observedModel !== null && receipt.observedModel !== MODEL) add(errors, "DeepSeek receipt observed model drift");
  if (receipt.observedEndpoint !== null && receipt.observedEndpoint !== ENDPOINT) add(errors, "DeepSeek receipt observed endpoint drift");
  if (receipt.reasoningContextRequested !== "NOT_APPLICABLE" || receipt.reasoningContextObserved !== "NOT_APPLICABLE"
    || receipt.storeRequested !== false || receipt.backgroundRequested !== false) {
    add(errors, "DeepSeek receipt request-control projection is invalid");
  }
  if (!validTimestamp(receipt.startedAt) || !validTimestamp(receipt.finishedAt)
    || !Number.isSafeInteger(receipt.latencyMs) || receipt.latencyMs < 0
    || Date.parse(receipt.finishedAt) - Date.parse(receipt.startedAt) !== receipt.latencyMs) {
    add(errors, "DeepSeek receipt timestamps or latency are invalid");
  }
  if (receipt.httpStatus !== null && (!Number.isSafeInteger(receipt.httpStatus) || receipt.httpStatus < 100 || receipt.httpStatus > 599)) {
    add(errors, "DeepSeek receipt HTTP status is invalid");
  }
  for (const field of ["inputTokens", "outputTokens", "reasoningTokens", "totalTokens"]) {
    if (!Number.isSafeInteger(receipt[field]) || receipt[field] < 0) add(errors, `DeepSeek receipt ${field} is invalid`);
  }
  if (receipt.inputTokens + receipt.outputTokens !== receipt.totalTokens || receipt.reasoningTokens > receipt.outputTokens) {
    add(errors, "DeepSeek receipt token accounting is inconsistent");
  }
  if (!Number.isFinite(receipt.estimatedCost) || receipt.estimatedCost < 0
    || !Number.isFinite(receipt.cumulativeCost) || receipt.cumulativeCost < receipt.estimatedCost) {
    add(errors, "DeepSeek receipt cost accounting is invalid");
  }
  if (receipt.requestBodyHash !== receipt.wireRequestBodyHash) add(errors, "DeepSeek receipt request and wire body hashes differ");
  if (receipt.attemptStatus === "SUCCEEDED") {
    if (receipt.observedModel !== MODEL || receipt.observedEndpoint !== ENDPOINT
      || !Number.isSafeInteger(receipt.httpStatus) || receipt.httpStatus < 200 || receipt.httpStatus > 299
      || receipt.finishReason !== "stop" || receipt.parseStatus !== "PARSED" || receipt.schemaStatus !== "VALID"
      || receipt.responseId === null || receipt.requestBodyHash === null || receipt.responseBodyHash === null
      || receipt.parsedOutputHash === null || receipt.retryClassification !== "NOT_A_RETRY" || receipt.redactedError !== null) {
      add(errors, "DeepSeek successful receipt is incomplete or tuple/schema-drifted");
    }
  } else if (!RETRYABLE.has(receipt.attemptStatus)) {
    add(errors, "DeepSeek receipt attempt status is not frozen");
  } else if (receipt.redactedError === null || receipt.retryClassification !== receipt.attemptStatus) {
    add(errors, "DeepSeek failed receipt retry classification or redacted error is invalid");
  }
  if (receipt.appendOnly !== true || receipt.atomicWrite !== true || receipt.fileMode !== "0600"
    || receipt.cacheHit !== false || receipt.providerInvoiceAuthoritative !== true) {
    add(errors, "DeepSeek receipt persistence contract is invalid");
  }
  const body = structuredClone(receipt);
  delete body.selfHash;
  if (receipt.selfHash !== jcsHash(body)) add(errors, "DeepSeek receipt self hash mismatch");
  return [...new Set(errors)];
}

export function buildDeepSeekProviderAttemptPayloadV2(input) {
  if (!exactFields(input, INPUT_FIELDS)) throw new Error("DeepSeek ProviderAttemptReceiptV2 input fields are invalid");
  const payload = {
    schemaVersion: "ProviderAttemptReceiptV2",
    designId: "MAIS-NATURAL-CA60-V5",
    ...structuredClone(input),
    appendOnly: true,
    atomicWrite: true,
    fileMode: "0600",
    cacheHit: false,
    providerInvoiceAuthoritative: true,
  };
  const body = { ...payload, sequenceNumber: 1, previousReceiptHash: null };
  const receipt = { ...body, selfHash: jcsHash(body) };
  const errors = validateDeepSeekProviderAttemptReceiptV2(receipt);
  if (errors.length > 0) throw new Error(`DeepSeek ProviderAttemptReceiptV2 payload is invalid: ${errors.join("; ")}`);
  return Object.freeze(payload);
}

function provisionalReceipt(payload) {
  const body = { ...structuredClone(payload), sequenceNumber: 1, previousReceiptHash: null };
  return { ...body, selfHash: jcsHash(body) };
}

export function createDeepSeekProviderAttemptReceiptStoreV2({ repoRoot, runId }) {
  const base = createAttemptReceiptStoreV1({ repoRoot, runId });
  return Object.freeze({
    path: base.path,
    async append(payload) {
      const preflightErrors = validateDeepSeekProviderAttemptReceiptV2(provisionalReceipt(payload));
      if (preflightErrors.length > 0) throw new Error(`DeepSeek receipt rejected before append: ${preflightErrors.join("; ")}`);
      const receipt = await base.append(payload);
      const errors = validateDeepSeekProviderAttemptReceiptV2(receipt);
      if (errors.length > 0) throw new Error(`DeepSeek receipt invalid after append: ${errors.join("; ")}`);
      return receipt;
    },
    async read() {
      const receipts = await base.read();
      const errors = receipts.flatMap((receipt, index) => validateDeepSeekProviderAttemptReceiptV2(receipt)
        .map((error) => `attempt ${index + 1}: ${error}`));
      if (errors.length > 0) throw new Error(`DeepSeek receipt chain invalid: ${errors.join("; ")}`);
      return receipts;
    },
    async validate() {
      const result = await base.validate();
      const semanticErrors = result.receipts.flatMap((receipt, index) => validateDeepSeekProviderAttemptReceiptV2(receipt)
        .map((error) => `attempt ${index + 1}: ${error}`));
      return { receipts: result.receipts, errors: [...new Set([...result.errors, ...semanticErrors])] };
    },
  });
}
