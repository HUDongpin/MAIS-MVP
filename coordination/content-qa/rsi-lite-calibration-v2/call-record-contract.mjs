import { createHash } from "node:crypto";

import { PROTOCOL_ID, PROTOCOL_VERSION } from "./protocol-design.mjs";
import { ROLE_FINDING_ALLOWLISTS } from "./role-contract.mjs";

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return createHash("sha256").update(typeof value === "string" ? value : stableStringify(value)).digest("hex");
}

function issue(code, detail) {
  return { code, detail };
}

function isSha256(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function nonnegativeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

export function createProviderCallRecordV2(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Provider call input must be an object.");
  const request = structuredClone(input.request ?? {});
  const response = structuredClone(input.response ?? {});
  const body = {
    protocolId: PROTOCOL_ID,
    protocolVersion: PROTOCOL_VERSION,
    schemaVersion: 2,
    packageId: input.packageId,
    role: input.role,
    projectionSha256: input.projectionSha256,
    repeatGroupId: input.repeatGroupId ?? null,
    stochasticParametersRecorded: true,
    request,
    requestParametersSha256: sha256(request),
    response
  };
  return { ...body, recordSha256: sha256(body) };
}

export function validateProviderCallRecordV2(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) return [issue("record-shape", "Call record must be an object.")];
  const issues = [];
  const push = (code, detail) => issues.push(issue(code, detail));
  if (record.protocolId !== PROTOCOL_ID || record.protocolVersion !== PROTOCOL_VERSION || record.schemaVersion !== 2) push("protocol-binding", "Call record protocol binding drifted.");
  if (typeof record.packageId !== "string" || record.packageId.trim() === "") push("package-binding", "Call record packageId is required.");
  if (!ROLE_FINDING_ALLOWLISTS[record.role] || record.role === "deterministic-baseline") push("role-binding", "Call record role must be a provider-backed allowlisted role.");
  if (!isSha256(record.projectionSha256)) push("projection-hash", "projectionSha256 is invalid.");
  if (record.stochasticParametersRecorded !== true) push("stochastic-marker", "Stochastic parameter recording marker is missing.");
  const request = record.request ?? {};
  const requiredRequestKeys = ["provider", "model", "temperature", "topP", "maxOutputTokens", "stream", "requestedSeed", "seedSupport"];
  for (const key of requiredRequestKeys) {
    if (!Object.hasOwn(request, key)) push("stochastic-parameter-missing", `Requested parameter ${key} is missing.`);
  }
  if (typeof request.provider !== "string" || request.provider.trim() === "") push("provider-request", "Requested provider is required.");
  if (typeof request.model !== "string" || request.model.trim() === "") push("model-request", "Requested model is required.");
  if (request.provider !== "DeepSeek") push("provider-contract-drift", "This registered protocol permits only DeepSeek as the machine reviewer provider.");
  if (request.model !== "deepseek-v4-pro") push("model-contract-drift", "This registered protocol permits only deepseek-v4-pro as the requested model.");
  if (!Number.isFinite(request.temperature) || request.temperature < 0 || request.temperature > 2) push("temperature-range", "temperature must be from 0 through 2.");
  if (!Number.isFinite(request.topP) || request.topP < 0 || request.topP > 1) push("top-p-range", "topP must be from 0 through 1.");
  if (!Number.isSafeInteger(request.maxOutputTokens) || request.maxOutputTokens <= 0) push("max-output-tokens", "maxOutputTokens must be a positive integer.");
  if (typeof request.stream !== "boolean") push("stream-parameter", "stream must be explicitly recorded as a boolean.");
  if (!Object.hasOwn(request, "requestedSeed")) push("seed-record", "requestedSeed must be explicitly recorded, including null.");
  if (!new Set(["not-assumed", "supported-and-requested", "unsupported"]).has(request.seedSupport)) push("seed-support", "seedSupport must state what is known without implying determinism.");
  if (record.requestParametersSha256 !== sha256(request)) push("request-parameter-hash", "Requested parameter hash drifted.");
  const response = record.response ?? {};
  if (typeof response.responseId !== "string" || response.responseId.trim() === "") push("response-id", "Observed provider response ID is required.");
  if (typeof response.observedModel !== "string" || response.observedModel.trim() === "") push("observed-model", "Observed provider model is required.");
  if (typeof response.createdAt !== "string" || Number.isNaN(Date.parse(response.createdAt))) push("response-time", "Observed provider timestamp is invalid.");
  if (typeof response.finishReason !== "string" || response.finishReason.trim() === "") push("finish-reason", "Provider finish reason is required.");
  const usage = response.usage ?? {};
  for (const key of ["promptCacheHitTokens", "promptCacheMissTokens", "outputTokens"]) {
    if (!nonnegativeInteger(usage[key])) push("usage-record", `Observed usage ${key} must be a non-negative integer.`);
  }
  const { recordSha256, ...body } = record;
  if (recordSha256 !== sha256(body)) push("record-hash", "Provider call record hash drifted.");
  return issues;
}

export function auditRepeatPairV2(records) {
  if (!Array.isArray(records) || records.length !== 2) return [issue("repeat-pair-count", "A repeat pair requires exactly two call records.")];
  const issues = records.flatMap((record) => validateProviderCallRecordV2(record));
  const [original, repeated] = records;
  if (!original.repeatGroupId || original.repeatGroupId !== repeated.repeatGroupId) issues.push(issue("repeat-group-binding", "Repeat records must share a non-empty repeatGroupId."));
  if (original.packageId !== repeated.packageId || original.role !== repeated.role) issues.push(issue("repeat-call-binding", "Repeat records must use the same package and role."));
  if (original.projectionSha256 !== repeated.projectionSha256) issues.push(issue("repeat-projection-drift", "Repeat records must reuse the frozen projection."));
  if (original.requestParametersSha256 !== repeated.requestParametersSha256) issues.push(issue("repeat-request-drift", "Repeat records must reuse identical request parameters."));
  if (original.response?.responseId === repeated.response?.responseId) issues.push(issue("repeat-response-identity", "Repeat records must bind distinct provider responses."));
  return issues;
}
