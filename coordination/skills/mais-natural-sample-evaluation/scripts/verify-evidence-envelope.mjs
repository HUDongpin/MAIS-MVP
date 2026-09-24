#!/usr/bin/env node

import { strictJsonParse } from "./strict-json.mjs";

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = path.join(SCRIPT_DIR, "..", "assets", "natural-evaluation-state.schema.json");
const MAX_INPUT_BYTES = 2 * 1024 * 1024;
const CANONICAL_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

const BLOCKED_STATES = new Set([
  "MATERIAL_REFREEZE_REQUIRED",
  "BLOCKED_MISSING_EVIDENCE",
  "BLOCKED_AUTHORITY",
  "BLOCKED_ROUTE_AUTHENTICITY",
  "BLOCKED_CUSTODY",
  "BLOCKED_DIRTY_SOURCE",
  "BLOCKED_SEQUENCE",
  "INTERRUPTED_RECONCILIATION_REQUIRED",
  "UNREVIEWABLE",
  "NEW_REGISTRATION_REQUIRED",
]);

const UNSAFE_KEY_FRAGMENTS = [
  "apikey", "secret", "password", "bearer", "privatekey", "credentialvalue",
  "rawquestion", "questiontext", "answertext", "itemid", "rawproviderresponse",
  "providerreasoning", "chainofthought", "responsebody", "requestbody", "prompttext",
  "protectedpath", "exactprotectedpath",
];
const UNSAFE_VALUE = /(?:^\/|file:\/\/|(?:^|\/)\.\.(?:\/|$)|\bBearer\s+[A-Za-z0-9._-]+|\bsk-[A-Za-z0-9]{8,})/;
const SAFE_NEGATIVE_FLAG_KEYS = new Set([
  "protectedContentIncluded", "credentialsIncluded", "rawProviderResponsesIncluded",
  "itemIdentifiersIncluded", "rawResponsesIncluded", "contentExposed", "contentCopiedToPublicArea",
]);
const TRUSTED_PATH_KEYS = new Set([
  "schemaVersion", "skill", "mode", "observedAt", "repository", "evidenceClass", "sourceIdentity",
  "resolvedState", "authority", "checks", "blockers", "claimCeiling", "nextAllowedAction",
  "evidenceHashes", "redaction", "protocol", "sourceRights", "frame", "sampleFreeze", "runner",
  "reference", "evaluated", "evaluatedCanary", "evaluatedRun", "materialCurrentness", "runProvenance", "registeredInferenceFrame",
  "activity", "result", "independentReview", "aggregateExport", "receiptGraph", "head", "branch",
  "clean", "logicalId", "sha256", "commit", "required", "proven", "missing", "expiresAt", "id",
  "status", "evidenceRef", "family", "registrationSha256", "activationReceiptSha256",
  "activePointerSha256", "immutable", "designProfileId", "registeredPowerArtifactSha256", "registeredClaimCeiling", "scopeReceiptSha256",
  "sourceScopeSha256", "providerEgressAuthorized", "credentialAccessAuthorized", "spendAuthorized",
  "referenceGrantBinding", "evaluatedGrantBinding", "readinessReceiptSha256", "freezeReceiptSha256",
  "manifestSha256", "runtimeVisibleScopeBound", "syntheticExcluded", "rowCount", "eligibleCount",
  "excludedCount", "sampleManifestSha256", "homologyManifestSha256", "sampleSize", "onePerCluster",
  "rerollForbidden", "custody", "metadataReceiptSha256", "custodyContextSha256",
  "protectedRootRefSha256", "directoryMode", "filesMode", "symlinkStatus", "contentExposed",
  "sourceCommit", "sourceClosureSha256", "closeoutReceiptSha256", "independentReviewReceiptSha256",
  "reviewDecision", "tracked", "custodyHandoff", "handoffReceiptSha256", "runnerRegistrationSha256",
  "runnerClosureSha256", "sourceCustodyRefSha256", "destinationCustodyRefSha256", "senderRole",
  "receiverRole", "transferMethod", "directoryModeVerification", "filesModeVerification",
  "symlinkVerification", "signatureStatus", "signatureAnchorSha256", "contentCopiedToPublicArea",
  "preflightReceiptSha256", "routeTrustAnchorSha256", "grantBinding", "naturalTextEgressAuthorized",
  "labelingReceiptSha256", "sealReceiptSha256", "executionRegistrationSha256", "canaryReceiptSha256",
  "runReceiptSha256", "role", "providerAdapterId", "modelId", "routeAnchorSha256", "phase",
  "credentialScopeSha256", "privacyRightsScopeSha256", "savePolicy", "redactionPolicy",
  "protocolRegistrationSha256", "runnerCommit", "issuedAt", "caps", "grantReceiptSha256",
  "attemptCap", "tokenCap", "currencyCapUsd", "concurrencyCap", "sourceBaselineReceiptSha256",
  "currentnessReceiptSha256", "registeredBindings", "currentBindings", "hasProviderActivity",
  "firstProviderActivity", "invalidatedRegistrationReceipts", "receiptSha256", "promptManifestSha256",
  "evidenceSchemaSha256", "taxonomySha256", "scorerSha256", "inferenceFrameSha256", "attempts",
  "completedCalls", "egress", "count", "known", "value", "reservations", "tokens", "costUsd",
  "peakConcurrency", "reconciliationReceiptSha256", "summaryReceiptSha256", "unknown", "present",
  "categories", "provenance", "scoreReceiptSha256", "resultReceiptSha256", "currentBindingsSha256",
  "registeredInferenceFrameSha256", "resultConclusion", "metrics", "metricsManifestSha256",
  "successfulCount", "failedCount", "freeze", "final", "claimBoundary", "identityAnchorSha256",
  "reviewedBindingsSha256", "authorizationReceiptSha256", "exportReceiptSha256", "claimBindingSha256",
  "metricsProvenance", "aggregateMetricsSha256", "allowlistValidated", "publicationAuthorized",
  "protectedContentIncluded", "credentialsIncluded", "rawProviderResponsesIncluded",
  "itemIdentifiersIncluded", "rawResponsesIncluded", "sequence", "kind", "subject", "parentSha256",
  "appendOnly", "bindingDigestSha256", "providerGrantBinding", "activityEvent", "eventType",
  "reservationsDelta", "attemptsDelta", "completedCallsDelta", "egressDelta", "tokensDelta",
  "costUsdDelta", "concurrencyObserved",
  "routeReceiptSha256", "receiptBody", "directParentSha256", "signer", "roleAnchor",
  "bindingProjectionCanonical", "externalAuthority", "nativeReceiptRef", "nativeReceiptSha256",
  "trustAnchorSha256", "verificationStatus", "contentAddressScope", "issuerAuthenticity",
  "providerAuthorityGranted", "custodyRelation",
]);

const SIGNED_KINDS = new Set([
  "FREEZE_REVIEW", "CUSTODY_HANDOFF", "RUNNER_REVIEW", "REFERENCE_PREFLIGHT",
  "REFERENCE_AUTHORIZATION", "EVALUATED_PREFLIGHT", "EVALUATED_AUTHORIZATION",
  "FINAL_REVIEW", "CLAIM_REVIEW", "AGGREGATE_EXPORT_AUTHORIZATION",
]);
const AUTHORIZATION_KINDS = new Set(["REFERENCE_AUTHORIZATION", "EVALUATED_AUTHORIZATION"]);
const ACTIVE_EVENT_KINDS = new Set([
  "REFERENCE_RESERVATION", "REFERENCE_ATTEMPT", "REFERENCE_COMPLETION", "REFERENCE_EGRESS",
  "EVALUATED_CANARY_RESERVATION", "EVALUATED_CANARY_ATTEMPT", "EVALUATED_CANARY_COMPLETION", "EVALUATED_CANARY_EGRESS",
  "EVALUATED_RUN_RESERVATION", "EVALUATED_RUN_ATTEMPT", "EVALUATED_RUN_COMPLETION", "EVALUATED_RUN_EGRESS",
]);
const ACTIVITY_EVENT_KINDS = new Set([
  ...ACTIVE_EVENT_KINDS,
  "REFERENCE_RECONCILIATION", "EVALUATED_CANARY_RECONCILIATION", "EVALUATED_RUN_RECONCILIATION",
]);
const AUXILIARY_KINDS = new Set(["MATERIAL_CURRENTNESS", "ACTIVITY_SUMMARY", ...ACTIVITY_EVENT_KINDS]);

export const UNKNOWN_ACTIVITY_CATEGORY_ORDER = Object.freeze([
  "ATTEMPT_RESERVATION_ONLY",
  "PROVIDER_DELIVERY_UNKNOWN",
  "COMPLETION_UNKNOWN",
  "EGRESS_UNKNOWN",
  "TOKEN_USAGE_UNKNOWN",
  "COST_UNKNOWN",
  "CONCURRENCY_UNKNOWN",
]);

const UNKNOWN_ACTIVITY_PHASES = Object.freeze([
  ["reference", "REFERENCE_LABELING"],
  ["evaluatedCanary", "EVALUATED_CANARY"],
  ["evaluatedRun", "EVALUATED_RUN"],
]);

export function deriveUnknownActivityCategories(packet) {
  const required = new Set();
  for (const [usageName, phase] of UNKNOWN_ACTIVITY_PHASES) {
    const nodes = (packet.receiptGraph ?? []).filter((node) => node.activityEvent?.phase === phase);
    const activeNodes = nodes.filter((node) => ACTIVE_EVENT_KINDS.has(node.kind));
    if (activeNodes.length === 0 || nodes.some((node) => node.activityEvent?.eventType === "RECONCILIATION")) continue;

    const usage = packet.activity?.[usageName];
    const reservations = activeNodes.reduce((sum, node) => sum + (node.activityEvent?.reservationsDelta ?? 0), 0);
    const attempts = activeNodes.reduce((sum, node) => sum + (node.activityEvent?.attemptsDelta ?? 0), 0);
    if (reservations > 0 && attempts === 0 && usage?.attempts?.known === false) required.add("ATTEMPT_RESERVATION_ONLY");
    if (usage?.attempts?.known === false) required.add("PROVIDER_DELIVERY_UNKNOWN");
    if (usage?.completedCalls?.known === false) required.add("COMPLETION_UNKNOWN");
    if (usage?.egress?.known === false) required.add("EGRESS_UNKNOWN");
    if (usage?.tokens?.known === false) required.add("TOKEN_USAGE_UNKNOWN");
    if (usage?.costUsd?.known === false) required.add("COST_UNKNOWN");
    if (usage?.peakConcurrency?.known === false) required.add("CONCURRENCY_UNKNOWN");
  }
  return UNKNOWN_ACTIVITY_CATEGORY_ORDER.filter((category) => required.has(category));
}

const SIGNER_ROLE_BY_KIND = new Map([
  ["FREEZE_REVIEW", "INDEPENDENT_FREEZE_REVIEWER"],
  ["CUSTODY_HANDOFF", "CUSTODY_HANDOFF_REVIEWER"],
  ["RUNNER_REVIEW", "INDEPENDENT_RUNNER_REVIEWER"],
  ["REFERENCE_PREFLIGHT", "REFERENCE_PREFLIGHT_AUTHORIZER"],
  ["REFERENCE_AUTHORIZATION", "REFERENCE_EXECUTION_AUTHORIZER"],
  ["EVALUATED_PREFLIGHT", "EVALUATED_PREFLIGHT_AUTHORIZER"],
  ["EVALUATED_AUTHORIZATION", "EVALUATED_EXECUTION_AUTHORIZER"],
  ["FINAL_REVIEW", "INDEPENDENT_RESULT_REVIEWER"],
  ["CLAIM_REVIEW", "INDEPENDENT_CLAIM_REVIEWER"],
  ["AGGREGATE_EXPORT_AUTHORIZATION", "AGGREGATE_EXPORT_AUTHORIZER"],
]);

const REVIEW_ARM_BY_KIND = new Map([
  ["FREEZE_REVIEW", "freeze"],
  ["RUNNER_REVIEW", "runner"],
  ["FINAL_REVIEW", "final"],
  ["CLAIM_REVIEW", "claimBoundary"],
]);
const SIGNED_REVIEW_OUTCOMES = new Set(["CONCURRED", "OBJECTED", "BLOCKED"]);
const NEGATIVE_REVIEW_OUTCOMES = new Set(["OBJECTED", "BLOCKED"]);

const EXTERNAL_EVIDENCE_KINDS = new Set([
  "REFERENCE_ROUTE", "REFERENCE_AUTHORIZATION", "REFERENCE_RESERVATION", "REFERENCE_ATTEMPT",
  "REFERENCE_COMPLETION", "REFERENCE_EGRESS", "REFERENCE_RECONCILIATION", "REFERENCE_LABELING",
  "REFERENCE_SEAL", "EVALUATED_ROUTE", "EVALUATED_AUTHORIZATION", "EVALUATED_EXECUTION_REGISTRATION",
  "EVALUATED_CANARY_RESERVATION", "EVALUATED_CANARY_ATTEMPT", "EVALUATED_CANARY_COMPLETION",
  "EVALUATED_CANARY_EGRESS", "EVALUATED_CANARY_RECONCILIATION", "EVALUATED_CANARY",
  "EVALUATED_RUN_RESERVATION", "EVALUATED_RUN_ATTEMPT", "EVALUATED_RUN_COMPLETION",
  "EVALUATED_RUN_EGRESS", "EVALUATED_RUN_RECONCILIATION", "EVALUATED_RUN", "SCORE", "RESULT_SEAL",
  "FINAL_REVIEW", "CLAIM_REVIEW", "AGGREGATE_EXPORT_AUTHORIZATION", "AGGREGATE_EXPORT",
]);

function externalEvidenceRequired(packet, node) {
  if (!EXTERNAL_EVIDENCE_KINDS.has(node.kind)) return false;
  if (node.kind.startsWith("REFERENCE_")) return packet.reference.routeTrustAnchorSha256 !== null;
  if (node.kind.startsWith("EVALUATED_")) return packet.evaluated.routeTrustAnchorSha256 !== null;
  return true;
}

export const NATURAL_LIFECYCLE_CONTRACT = [
  ["PROTOCOL_REGISTRATION", "PROTOCOL_REGISTERED", "ACTIVATE_PROTOCOL"],
  ["PROTOCOL_ACTIVATION", "PROTOCOL_ACTIVATED", "PIN_SOURCE_BASELINE"],
  ["SOURCE_BASELINE", "SOURCE_BASELINE_PINNED", "AUTHORIZE_SOURCE_RIGHTS"],
  ["SOURCE_RIGHTS", "RIGHTS_AND_LINEAGE_AUTHORIZED", "VERIFY_FRAME_READINESS"],
  ["FRAME_READINESS", "FRAME_READINESS_VERIFIED", "FREEZE_FRAME_AND_SAMPLE"],
  ["FRAME_FREEZE", "FRAME_FROZEN", "FREEZE_FRAME_AND_SAMPLE"],
  ["SAMPLE_FREEZE", "SAMPLE_FROZEN", "RUN_INDEPENDENT_FREEZE_REVIEW"],
  ["FREEZE_REVIEW", "FREEZE_INDEPENDENTLY_VERIFIED", "REGISTER_RUNNER"],
  ["RUNNER_REGISTRATION", "RUNNER_REGISTERED", "RUN_RUNNER_CLOSEOUT"],
  ["RUNNER_CLOSEOUT", "RUNNER_CLOSEOUT_RECORDED", "RUN_INDEPENDENT_RUNNER_REVIEW"],
  ["RUNNER_REVIEW", "RUNNER_INDEPENDENTLY_VERIFIED", "REQUEST_REFERENCE_PREFLIGHT_AUTHORIZATION"],
  ["CUSTODY_HANDOFF", "CUSTODY_HANDOFF_VERIFIED", "REQUEST_REFERENCE_PREFLIGHT_AUTHORIZATION"],
  ["REFERENCE_PREFLIGHT", "REFERENCE_PREFLIGHT_AUTHORIZED", "REGISTER_REFERENCE_ROUTE_EVIDENCE"],
  ["REFERENCE_ROUTE", "REFERENCE_ROUTE_TRUSTED", "REQUEST_REFERENCE_EXECUTION_AUTHORIZATION"],
  ["REFERENCE_AUTHORIZATION", "REFERENCE_EXECUTION_AUTHORIZED", "RUN_REFERENCE_LABELING"],
  ["REFERENCE_LABELING", "REFERENCE_LABELING_COMPLETE", "SEAL_REFERENCE"],
  ["REFERENCE_SEAL", "REFERENCE_SEALED", "REQUEST_EVALUATED_PREFLIGHT_AUTHORIZATION"],
  ["EVALUATED_PREFLIGHT", "EVALUATED_PREFLIGHT_AUTHORIZED", "REGISTER_EVALUATED_ROUTE_EVIDENCE"],
  ["EVALUATED_ROUTE", "EVALUATED_ROUTE_TRUSTED", "REQUEST_EVALUATED_EXECUTION_AUTHORIZATION"],
  ["EVALUATED_AUTHORIZATION", "EVALUATED_EXECUTION_AUTHORIZED", "FREEZE_EVALUATED_EXECUTION_REGISTRATION"],
  ["EVALUATED_EXECUTION_REGISTRATION", "EVALUATED_EXECUTION_REGISTRATION_FROZEN", "RUN_EVALUATED_CANARY"],
  ["EVALUATED_CANARY", "EVALUATED_CANARY_COMPLETE", "RESUME_EVALUATED_RUN"],
  ["EVALUATED_RUN", "EVALUATED_RUN_COMPLETE", "RECONCILE_ACTIVITY_OFFLINE"],
  ["SCORE", "SCORED", "SEAL_RESULT"],
  ["RESULT_SEAL", "RESULT_SEALED", "RUN_FINAL_INDEPENDENT_REVIEW"],
  ["FINAL_REVIEW", "FINAL_INDEPENDENT_REVIEWED", "RUN_CLAIM_BOUNDARY_REVIEW"],
  ["CLAIM_REVIEW", "CLAIM_BOUNDARY_REVIEWED", "REQUEST_AGGREGATE_EXPORT_AUTHORIZATION"],
  ["AGGREGATE_EXPORT_AUTHORIZATION", "AGGREGATE_EXPORT_AUTHORIZED", "EXPORT_REDACTED_AGGREGATE"],
  ["AGGREGATE_EXPORT", "CLOSED", "CLOSE"],
];

const SUBJECT_BY_KIND = new Map([
  ["PROTOCOL_REGISTRATION", "PROTOCOL"], ["PROTOCOL_ACTIVATION", "PROTOCOL"],
  ["SOURCE_BASELINE", "SOURCE"], ["MATERIAL_CURRENTNESS", "SOURCE"], ["SOURCE_RIGHTS", "SOURCE_RIGHTS"],
  ["FRAME_READINESS", "FRAME"], ["FRAME_FREEZE", "FRAME"], ["SAMPLE_FREEZE", "SAMPLE"],
  ["FREEZE_REVIEW", "FREEZE_REVIEW"], ["CUSTODY_HANDOFF", "CUSTODY"],
  ["RUNNER_REGISTRATION", "RUNNER"], ["RUNNER_CLOSEOUT", "RUNNER"], ["RUNNER_REVIEW", "RUNNER"],
  ["REFERENCE_PREFLIGHT", "REFERENCE_PROVIDER"], ["REFERENCE_ROUTE", "REFERENCE_PROVIDER"],
  ["REFERENCE_AUTHORIZATION", "REFERENCE_PROVIDER"], ["REFERENCE_RESERVATION", "ACTIVITY"],
  ["REFERENCE_ATTEMPT", "ACTIVITY"], ["REFERENCE_COMPLETION", "ACTIVITY"],
  ["REFERENCE_EGRESS", "ACTIVITY"], ["REFERENCE_RECONCILIATION", "ACTIVITY"],
  ["REFERENCE_LABELING", "REFERENCE_PROVIDER"], ["REFERENCE_SEAL", "REFERENCE_PROVIDER"],
  ["EVALUATED_PREFLIGHT", "EVALUATED_PROVIDER"], ["EVALUATED_ROUTE", "EVALUATED_PROVIDER"],
  ["EVALUATED_AUTHORIZATION", "EVALUATED_PROVIDER"], ["EVALUATED_EXECUTION_REGISTRATION", "EVALUATED_PROVIDER"],
  ["EVALUATED_CANARY_RESERVATION", "ACTIVITY"], ["EVALUATED_CANARY_ATTEMPT", "ACTIVITY"],
  ["EVALUATED_CANARY_COMPLETION", "ACTIVITY"], ["EVALUATED_CANARY_EGRESS", "ACTIVITY"],
  ["EVALUATED_CANARY_RECONCILIATION", "ACTIVITY"], ["EVALUATED_CANARY", "EVALUATED_PROVIDER"],
  ["EVALUATED_RUN_RESERVATION", "ACTIVITY"], ["EVALUATED_RUN_ATTEMPT", "ACTIVITY"],
  ["EVALUATED_RUN_COMPLETION", "ACTIVITY"], ["EVALUATED_RUN_EGRESS", "ACTIVITY"],
  ["EVALUATED_RUN_RECONCILIATION", "ACTIVITY"],
  ["EVALUATED_RUN", "EVALUATED_PROVIDER"], ["ACTIVITY_SUMMARY", "ACTIVITY"],
  ["SCORE", "RESULT"], ["RESULT_SEAL", "RESULT"], ["FINAL_REVIEW", "FINAL_REVIEW"],
  ["CLAIM_REVIEW", "CLAIM_REVIEW"], ["AGGREGATE_EXPORT_AUTHORIZATION", "EXPORT"],
  ["AGGREGATE_EXPORT", "EXPORT"],
]);

let schemaCache;

function issue(code, pathValue, severity = "invalid") {
  return { code, path: safeIssuePath(pathValue), severity };
}

function safeIssuePath(pointer) {
  if (pointer === "#" || pointer === "#[redacted]") return pointer;
  const segments = pointer.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (segments.every((segment) => /^\d+$/.test(segment) || TRUSTED_PATH_KEYS.has(segment))) return pointer;
  return "#[redacted]";
}

function typeMatches(value, expected) {
  if (expected === "null") return value === null;
  if (expected === "array") return Array.isArray(value);
  if (expected === "object") return value !== null && typeof value === "object" && !Array.isArray(value);
  if (expected === "integer") return Number.isInteger(value);
  if (expected === "number") return typeof value === "number" && Number.isFinite(value);
  return typeof value === expected;
}

function resolveRef(rootSchema, ref) {
  if (!ref.startsWith("#/$defs/")) return null;
  return rootSchema.$defs?.[ref.slice("#/$defs/".length)] ?? null;
}

function validateSchemaNode(value, rawSchema, rootSchema, pointer, issues) {
  let schema = rawSchema;
  if (schema.$ref) {
    schema = resolveRef(rootSchema, schema.$ref);
    if (!schema) {
      issues.push(issue("SCHEMA_REFERENCE_INVALID", pointer));
      return;
    }
  }
  if (schema.allOf) {
    for (const branch of schema.allOf) validateSchemaNode(value, branch, rootSchema, pointer, issues);
  }
  if (schema.if) {
    const conditionIssues = [];
    validateSchemaNode(value, schema.if, rootSchema, pointer, conditionIssues);
    if (conditionIssues.length === 0 && schema.then) validateSchemaNode(value, schema.then, rootSchema, pointer, issues);
    if (conditionIssues.length > 0 && schema.else) validateSchemaNode(value, schema.else, rootSchema, pointer, issues);
  }
  if (schema.anyOf) {
    const passing = schema.anyOf.some((branch) => {
      const branchIssues = [];
      validateSchemaNode(value, branch, rootSchema, pointer, branchIssues);
      return branchIssues.length === 0;
    });
    if (!passing) issues.push(issue("SCHEMA_ANY_OF_MISMATCH", pointer));
  }
  if (schema.not) {
    const branchIssues = [];
    validateSchemaNode(value, schema.not, rootSchema, pointer, branchIssues);
    if (branchIssues.length === 0) issues.push(issue("SCHEMA_NOT_MISMATCH", pointer));
  }
  if (schema.oneOf) {
    const passing = schema.oneOf.filter((branch) => {
      const branchIssues = [];
      validateSchemaNode(value, branch, rootSchema, pointer, branchIssues);
      return branchIssues.length === 0;
    });
    if (passing.length !== 1) issues.push(issue("SCHEMA_ONE_OF_MISMATCH", pointer));
    return;
  }
  if (Object.prototype.hasOwnProperty.call(schema, "const") && value !== schema.const) {
    issues.push(issue("SCHEMA_CONST_MISMATCH", pointer));
    return;
  }
  if (schema.enum && !schema.enum.includes(value)) {
    issues.push(issue("SCHEMA_ENUM_MISMATCH", pointer));
    return;
  }
  if (schema.type) {
    const allowed = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!allowed.some((candidate) => typeMatches(value, candidate))) {
      issues.push(issue("SCHEMA_TYPE_MISMATCH", pointer));
      return;
    }
  }
  if (typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) issues.push(issue("SCHEMA_STRING_TOO_SHORT", pointer));
    if (schema.maxLength !== undefined && value.length > schema.maxLength) issues.push(issue("SCHEMA_STRING_TOO_LONG", pointer));
    if (schema.pattern && !new RegExp(schema.pattern, "u").test(value)) issues.push(issue("SCHEMA_PATTERN_MISMATCH", pointer));
  }
  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) issues.push(issue("SCHEMA_MINIMUM_VIOLATION", pointer));
    if (schema.maximum !== undefined && value > schema.maximum) issues.push(issue("SCHEMA_MAXIMUM_VIOLATION", pointer));
    if (schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) issues.push(issue("SCHEMA_EXCLUSIVE_MINIMUM_VIOLATION", pointer));
    if (schema.exclusiveMaximum !== undefined && value >= schema.exclusiveMaximum) issues.push(issue("SCHEMA_EXCLUSIVE_MAXIMUM_VIOLATION", pointer));
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) issues.push(issue("SCHEMA_ARRAY_TOO_SHORT", pointer));
    if (schema.maxItems !== undefined && value.length > schema.maxItems) issues.push(issue("SCHEMA_ARRAY_TOO_LONG", pointer));
    if (schema.uniqueItems) {
      const encoded = value.map((entry) => JSON.stringify(entry));
      if (new Set(encoded).size !== encoded.length) issues.push(issue("SCHEMA_ITEMS_NOT_UNIQUE", pointer));
    }
    if (schema.contains) {
      const count = value.filter((entry, index) => {
        const branchIssues = [];
        validateSchemaNode(entry, schema.contains, rootSchema, `${pointer}/${index}`, branchIssues);
        return branchIssues.length === 0;
      }).length;
      const minimum = schema.minContains ?? 1;
      const maximum = schema.maxContains ?? Infinity;
      if (count < minimum || count > maximum) issues.push(issue("SCHEMA_CONTAINS_MISMATCH", pointer));
    }
    if (schema.items) value.forEach((entry, index) => validateSchemaNode(entry, schema.items, rootSchema, `${pointer}/${index}`, issues));
  }
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    const properties = schema.properties ?? {};
    for (const required of schema.required ?? []) {
      if (!Object.prototype.hasOwnProperty.call(value, required)) issues.push(issue("SCHEMA_REQUIRED_MISSING", `${pointer}/${required}`));
    }
    for (const [key, child] of Object.entries(value)) {
      if (properties[key]) validateSchemaNode(child, properties[key], rootSchema, `${pointer}/${key}`, issues);
      else if (schema.additionalProperties === false) issues.push(issue("SCHEMA_UNKNOWN_PROPERTY", pointer));
    }
  }
}

function scanUnsafe(value, pointer = "#", issues = []) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => scanUnsafe(entry, `${pointer}/${index}`, issues));
    return issues;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      const normalized = key.replace(/[^a-z0-9]/gi, "").toLowerCase();
      if (!SAFE_NEGATIVE_FLAG_KEYS.has(key) && UNSAFE_KEY_FRAGMENTS.some((fragment) => normalized.includes(fragment))) {
        issues.push(issue("UNSAFE_FIELD_PRESENT", pointer));
        continue;
      }
      const childPointer = TRUSTED_PATH_KEYS.has(key) ? `${pointer}/${key}` : "#[redacted]";
      scanUnsafe(child, childPointer, issues);
    }
    return issues;
  }
  if (typeof value === "string" && UNSAFE_VALUE.test(value)) issues.push(issue("UNSAFE_VALUE_PRESENT", pointer));
  return issues;
}

function canonicalize(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function canonicalDigest(value) {
  return createHash("sha256").update(canonicalize(value)).digest("hex");
}

function deepEqual(left, right) {
  return canonicalize(left) === canonicalize(right);
}

function canonicalTimestampMs(value) {
  if (typeof value !== "string" || !CANONICAL_TIMESTAMP.test(value)) return null;
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return null;
  try {
    if (new Date(ms).toISOString() !== value) return null;
  } catch {
    return null;
  }
  return ms;
}

function collectSha256Values(value, key = "", output = new Set()) {
  if (Array.isArray(value)) {
    if (key === "evidenceHashes") return output;
    for (const entry of value) collectSha256Values(entry, "", output);
    return output;
  }
  if (value !== null && typeof value === "object") {
    for (const [childKey, child] of Object.entries(value)) collectSha256Values(child, childKey, output);
    return output;
  }
  if (typeof value === "string") {
    if ((key === "sha256" || key.endsWith("Sha256")) && /^[a-f0-9]{64}$/.test(value)) output.add(value);
    if (key === "evidenceRef" && /^sha256:[a-f0-9]{64}$/.test(value)) output.add(value.slice(7));
  }
  return output;
}

function custodyRequired(packet) {
  const source = packet.sampleFreeze.custody.custodyContextSha256;
  const destination = packet.runner.custodyContextSha256;
  return typeof source === "string" && typeof destination === "string" && source !== destination;
}

function milestonesFor(packet) {
  return NATURAL_LIFECYCLE_CONTRACT.filter(([kind]) => kind !== "CUSTODY_HANDOFF" || custodyRequired(packet));
}

function nodeByKind(packet, kind) {
  return packet.receiptGraph.find((node) => node.kind === kind) ?? null;
}

function nodesByKind(packet, kind) {
  return packet.receiptGraph.filter((node) => node.kind === kind);
}

function receiptForKind(packet, kind) {
  switch (kind) {
    case "PROTOCOL_REGISTRATION": return packet.protocol.registrationSha256;
    case "PROTOCOL_ACTIVATION": return packet.protocol.activationReceiptSha256;
    case "SOURCE_BASELINE": return packet.materialCurrentness.sourceBaselineReceiptSha256;
    case "MATERIAL_CURRENTNESS": return packet.materialCurrentness.currentnessReceiptSha256;
    case "SOURCE_RIGHTS": return packet.sourceRights.scopeReceiptSha256;
    case "FRAME_READINESS": return packet.frame.readinessReceiptSha256;
    case "FRAME_FREEZE": return packet.frame.freezeReceiptSha256;
    case "SAMPLE_FREEZE": return packet.sampleFreeze.freezeReceiptSha256;
    case "FREEZE_REVIEW": return packet.independentReview.freeze.receiptSha256;
    case "CUSTODY_HANDOFF": return packet.runner.custodyHandoff.handoffReceiptSha256;
    case "RUNNER_REGISTRATION": return packet.runner.registrationSha256;
    case "RUNNER_CLOSEOUT": return packet.runner.closeoutReceiptSha256;
    case "RUNNER_REVIEW": return packet.independentReview.runner.receiptSha256;
    case "REFERENCE_PREFLIGHT": return packet.reference.preflightReceiptSha256;
    case "REFERENCE_ROUTE": return packet.reference.routeReceiptSha256;
    case "REFERENCE_AUTHORIZATION": return packet.reference.grantBinding?.grantReceiptSha256 ?? null;
    case "REFERENCE_RECONCILIATION": return packet.activity.reference.reconciliationReceiptSha256;
    case "REFERENCE_LABELING": return packet.reference.labelingReceiptSha256;
    case "REFERENCE_SEAL": return packet.reference.sealReceiptSha256;
    case "EVALUATED_PREFLIGHT": return packet.evaluated.preflightReceiptSha256;
    case "EVALUATED_ROUTE": return packet.evaluated.routeReceiptSha256;
    case "EVALUATED_AUTHORIZATION": return packet.evaluated.grantBinding?.grantReceiptSha256 ?? null;
    case "EVALUATED_EXECUTION_REGISTRATION": return packet.evaluated.executionRegistrationSha256;
    case "EVALUATED_CANARY_RECONCILIATION": return packet.activity.evaluatedCanary.reconciliationReceiptSha256;
    case "EVALUATED_CANARY": return packet.evaluated.canaryReceiptSha256;
    case "EVALUATED_RUN_RECONCILIATION": return packet.activity.evaluatedRun.reconciliationReceiptSha256;
    case "EVALUATED_RUN": return packet.evaluated.runReceiptSha256;
    case "ACTIVITY_SUMMARY": return packet.activity.summaryReceiptSha256;
    case "SCORE": return packet.result.scoreReceiptSha256;
    case "RESULT_SEAL": return packet.result.resultReceiptSha256;
    case "FINAL_REVIEW": return packet.independentReview.final.receiptSha256;
    case "CLAIM_REVIEW": return packet.independentReview.claimBoundary.receiptSha256;
    case "AGGREGATE_EXPORT_AUTHORIZATION": return packet.aggregateExport.authorizationReceiptSha256;
    case "AGGREGATE_EXPORT": return packet.aggregateExport.exportReceiptSha256;
    default: return null;
  }
}

function reviewExpectation(packet, arm) {
  if (arm === "freeze") {
    return canonicalDigest({
      protocolRegistrationSha256: packet.materialCurrentness.registeredBindings.protocolRegistrationSha256,
      sampleManifestSha256: packet.materialCurrentness.registeredBindings.sampleManifestSha256,
      promptManifestSha256: packet.materialCurrentness.registeredBindings.promptManifestSha256,
      evidenceSchemaSha256: packet.materialCurrentness.registeredBindings.evidenceSchemaSha256,
      taxonomySha256: packet.materialCurrentness.registeredBindings.taxonomySha256,
      scorerSha256: packet.materialCurrentness.registeredBindings.scorerSha256,
      frameManifestSha256: packet.frame.manifestSha256,
    });
  }
  if (arm === "runner") {
    return canonicalDigest({
      registeredBindings: packet.materialCurrentness.registeredBindings,
      runnerRegistrationSha256: packet.runner.registrationSha256,
      runnerClosureSha256: packet.runner.sourceClosureSha256,
      runnerCommit: packet.runner.sourceCommit,
    });
  }
  if (arm === "final") {
    return canonicalDigest({
      resultReceiptSha256: packet.result.resultReceiptSha256,
      currentBindingsSha256: packet.result.currentBindingsSha256,
      resultConclusion: packet.result.resultConclusion,
      metricsManifestSha256: packet.result.metrics.metricsManifestSha256,
    });
  }
  return canonicalDigest({
    resultReceiptSha256: packet.result.resultReceiptSha256,
    resultConclusion: packet.result.resultConclusion,
    claimCeiling: packet.claimCeiling,
  });
}

function inferenceFramePayload(frame) {
  const { inferenceFrameSha256: ignored, ...payload } = frame;
  return payload;
}

function currentnessBinding(packet) {
  return {
    status: packet.materialCurrentness.status,
    registeredBindings: packet.materialCurrentness.registeredBindings,
    currentBindings: packet.materialCurrentness.currentBindings,
    hasProviderActivity: packet.materialCurrentness.hasProviderActivity,
    firstProviderActivity: packet.materialCurrentness.firstProviderActivity,
    invalidatedRegistrationReceipts: packet.materialCurrentness.invalidatedRegistrationReceipts,
  };
}

function omitKeys(value, keys) {
  if (value === null) return null;
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function grantProjection(grant) {
  return grant === null ? null : omitKeys(grant, ["grantReceiptSha256"]);
}

function reviewProjection(arm) {
  return omitKeys(arm, ["receiptSha256"]);
}

function phaseUsageProjection(value) {
  const withoutReceipt = (entry) => omitKeys(entry, ["receiptSha256"]);
  return {
    ...value,
    reservations: withoutReceipt(value.reservations),
    attempts: withoutReceipt(value.attempts),
    completedCalls: withoutReceipt(value.completedCalls),
    egress: withoutReceipt(value.egress),
    tokens: withoutReceipt(value.tokens),
    costUsd: withoutReceipt(value.costUsd),
    peakConcurrency: withoutReceipt(value.peakConcurrency),
  };
}

function activityProjection(activity) {
  const withoutReceipt = (value) => omitKeys(value, ["receiptSha256"]);
  return {
    attempts: withoutReceipt(activity.attempts),
    completedCalls: withoutReceipt(activity.completedCalls),
    egress: withoutReceipt(activity.egress),
    reference: phaseUsageProjection(activity.reference),
    evaluatedCanary: phaseUsageProjection(activity.evaluatedCanary),
    evaluatedRun: phaseUsageProjection(activity.evaluatedRun),
    unknown: omitKeys(activity.unknown, ["reconciliationReceiptSha256"]),
  };
}

export function bindingForReceiptNode(packet, node) {
  const kind = node.kind;
  switch (kind) {
    case "PROTOCOL_REGISTRATION":
      return {
        family: packet.protocol.family,
        logicalId: packet.protocol.logicalId,
        immutable: packet.protocol.immutable,
        designProfileId: packet.protocol.designProfileId,
        registeredPowerArtifactSha256: packet.protocol.registeredPowerArtifactSha256,
        registeredClaimCeiling: packet.protocol.registeredClaimCeiling,
      };
    case "PROTOCOL_ACTIVATION":
      return { registrationSha256: packet.protocol.registrationSha256, activePointerSha256: packet.protocol.activePointerSha256 };
    case "SOURCE_BASELINE":
      return { sourceIdentity: packet.sourceIdentity, repository: packet.repository };
    case "MATERIAL_CURRENTNESS": return currentnessBinding(packet);
    case "SOURCE_RIGHTS":
      return { sourceScopeSha256: packet.sourceRights.sourceScopeSha256, sourceFreezeRightsAuthorized: nodeByKind(packet, "SOURCE_RIGHTS") !== null };
    case "FRAME_READINESS":
      return { manifestSha256: packet.frame.manifestSha256, runtimeVisibleScopeBound: packet.frame.runtimeVisibleScopeBound, syntheticExcluded: packet.frame.syntheticExcluded };
    case "FRAME_FREEZE": return omitKeys(packet.frame, ["freezeReceiptSha256", "status"]);
    case "SAMPLE_FREEZE": return omitKeys(packet.sampleFreeze, ["freezeReceiptSha256", "status"]);
    case "FREEZE_REVIEW": return { review: reviewProjection(packet.independentReview.freeze), expectedBindingsSha256: reviewExpectation(packet, "freeze") };
    case "CUSTODY_HANDOFF": return omitKeys(packet.runner.custodyHandoff, ["handoffReceiptSha256", "status"]);
    case "RUNNER_REGISTRATION":
      return { sourceCommit: packet.runner.sourceCommit, sourceClosureSha256: packet.runner.sourceClosureSha256, custodyContextSha256: packet.runner.custodyContextSha256 };
    case "RUNNER_CLOSEOUT":
      return { registrationSha256: packet.runner.registrationSha256, sourceCommit: packet.runner.sourceCommit, sourceClosureSha256: packet.runner.sourceClosureSha256, tracked: packet.runner.tracked, clean: packet.runner.clean };
    case "RUNNER_REVIEW": return { review: reviewProjection(packet.independentReview.runner), expectedBindingsSha256: reviewExpectation(packet, "runner") };
    case "REFERENCE_PREFLIGHT":
      return { currentBindings: packet.materialCurrentness.currentBindings, naturalTextEgressAuthorized: false };
    case "REFERENCE_ROUTE":
      return { preflightReceiptSha256: packet.reference.preflightReceiptSha256, routeTrustAnchorSha256: packet.reference.routeTrustAnchorSha256 };
    case "REFERENCE_AUTHORIZATION": return grantProjection(packet.reference.grantBinding);
    case "REFERENCE_LABELING":
      return { grantBinding: packet.reference.grantBinding, registeredInferenceFrameSha256: packet.registeredInferenceFrame.inferenceFrameSha256, reconciliationReceiptSha256: packet.activity.reference.reconciliationReceiptSha256 };
    case "REFERENCE_SEAL":
      return { labelingReceiptSha256: packet.reference.labelingReceiptSha256, registeredInferenceFrameSha256: packet.registeredInferenceFrame.inferenceFrameSha256, reconciliationReceiptSha256: packet.activity.reference.reconciliationReceiptSha256 };
    case "EVALUATED_PREFLIGHT":
      return { currentBindings: packet.materialCurrentness.currentBindings, naturalTextEgressAuthorized: false };
    case "EVALUATED_ROUTE":
      return { preflightReceiptSha256: packet.evaluated.preflightReceiptSha256, routeTrustAnchorSha256: packet.evaluated.routeTrustAnchorSha256 };
    case "EVALUATED_AUTHORIZATION": return grantProjection(packet.evaluated.grantBinding);
    case "EVALUATED_EXECUTION_REGISTRATION":
      return { grantBinding: packet.evaluated.grantBinding, registeredInferenceFrameSha256: packet.registeredInferenceFrame.inferenceFrameSha256 };
    case "EVALUATED_CANARY":
      return {
        executionRegistrationSha256: packet.evaluated.executionRegistrationSha256,
        grantBinding: packet.evaluated.grantBinding,
        canaryReconciliationReceiptSha256: packet.activity.evaluatedCanary.reconciliationReceiptSha256,
      };
    case "EVALUATED_RUN":
      return {
        executionRegistrationSha256: packet.evaluated.executionRegistrationSha256,
        grantBinding: packet.evaluated.grantBinding,
        registeredInferenceFrameSha256: packet.registeredInferenceFrame.inferenceFrameSha256,
        canaryReceiptSha256: packet.evaluated.canaryReceiptSha256,
        fullRunReconciliationReceiptSha256: packet.activity.evaluatedRun.reconciliationReceiptSha256,
        fullRunCoverageSha256: canonicalDigest(phaseUsageProjection(packet.activity.evaluatedRun)),
      };
    case "REFERENCE_RESERVATION": case "REFERENCE_ATTEMPT": case "REFERENCE_COMPLETION": case "REFERENCE_EGRESS": case "REFERENCE_RECONCILIATION":
    case "EVALUATED_CANARY_RESERVATION": case "EVALUATED_CANARY_ATTEMPT": case "EVALUATED_CANARY_COMPLETION": case "EVALUATED_CANARY_EGRESS": case "EVALUATED_CANARY_RECONCILIATION":
    case "EVALUATED_RUN_RESERVATION": case "EVALUATED_RUN_ATTEMPT": case "EVALUATED_RUN_COMPLETION": case "EVALUATED_RUN_EGRESS": case "EVALUATED_RUN_RECONCILIATION":
      return { activityEvent: node.activityEvent };
    case "ACTIVITY_SUMMARY": return activityProjection(packet.activity);
    case "SCORE":
      return { provenance: packet.result.provenance, currentBindingsSha256: packet.result.currentBindingsSha256, registeredInferenceFrameSha256: packet.result.registeredInferenceFrameSha256, resultConclusion: packet.result.resultConclusion, metrics: packet.result.metrics };
    case "RESULT_SEAL": return omitKeys(packet.result, ["resultReceiptSha256", "status"]);
    case "FINAL_REVIEW": return { review: reviewProjection(packet.independentReview.final), expectedBindingsSha256: reviewExpectation(packet, "final") };
    case "CLAIM_REVIEW": return { review: reviewProjection(packet.independentReview.claimBoundary), expectedBindingsSha256: reviewExpectation(packet, "claimBoundary") };
    case "AGGREGATE_EXPORT_AUTHORIZATION":
      return omitKeys(packet.aggregateExport, ["status", "authorizationReceiptSha256", "exportReceiptSha256"]);
    case "AGGREGATE_EXPORT": return omitKeys(packet.aggregateExport, ["status", "exportReceiptSha256"]);
    default: return null;
  }
}

function receiptStatusForNode(packet, node) {
  if (ACTIVITY_EVENT_KINDS.has(node.kind)) return node.activityEvent?.eventType ?? "UNKNOWN";
  if (node.kind === "MATERIAL_CURRENTNESS") return packet.materialCurrentness.status;
  if (node.kind === "ACTIVITY_SUMMARY") return packet.activity.unknown.present ? "UNKNOWN_ACTIVITY" : "RECONCILED";
  const reviewArm = REVIEW_ARM_BY_KIND.get(node.kind);
  if (reviewArm) return packet.independentReview[reviewArm].status;
  const lifecycle = NATURAL_LIFECYCLE_CONTRACT.find(([kind]) => kind === node.kind);
  return lifecycle?.[1] ?? "RECORDED";
}

function defaultExternalAuthority() {
  return {
    nativeReceiptRef: null,
    nativeReceiptSha256: null,
    trustAnchorSha256: null,
    verificationStatus: "UNKNOWN",
  };
}

export function receiptBodyForNode(packet, node) {
  const binding = bindingForReceiptNode(packet, node);
  const externalAuthority = node.receiptBody?.externalAuthority ?? defaultExternalAuthority();
  return {
    schemaVersion: "natural-receipt-body.v1",
    kind: node.kind,
    subject: node.subject,
    directParentSha256: node.parentSha256,
    sequence: node.sequence,
    observedAt: node.observedAt,
    status: receiptStatusForNode(packet, node),
    bindingDigestSha256: binding === null ? null : canonicalDigest(binding),
    bindingProjectionCanonical: binding === null ? "null" : canonicalize(binding),
    signer: {
      identityAnchorSha256: node.signatureAnchorSha256,
      roleAnchor: SIGNER_ROLE_BY_KIND.get(node.kind) ?? "SYSTEM_APPEND_ONLY",
      signatureStatus: node.signatureStatus,
    },
    expiresAt: node.expiresAt,
    externalAuthority,
  };
}

export function expectedNodeSubject(kind) {
  return SUBJECT_BY_KIND.get(kind) ?? null;
}

function validateAuthority(packet, issues, nowMs) {
  const required = new Set(packet.authority.required);
  const proven = new Set(packet.authority.proven);
  const missing = new Set(packet.authority.missing);
  for (const value of required) {
    if (proven.has(value) === missing.has(value)) issues.push(issue("AUTHORITY_PARTITION_INVALID", "#/authority", "blocked"));
  }
  for (const value of proven) if (!required.has(value)) issues.push(issue("AUTHORITY_PROOF_OUT_OF_SCOPE", "#/authority", "blocked"));
  for (const value of missing) if (!required.has(value)) issues.push(issue("AUTHORITY_MISSING_OUT_OF_SCOPE", "#/authority", "blocked"));
  if (packet.mode === "EXECUTE_OR_RESUME" && required.size === 0) issues.push(issue("EXECUTION_AUTHORITY_REQUIRED_EMPTY", "#/authority", "blocked"));
  if (nodeByKind(packet, "SOURCE_RIGHTS")
      && (!required.has("SOURCE_FREEZE_RIGHTS") || !proven.has("SOURCE_FREEZE_RIGHTS") || missing.has("SOURCE_FREEZE_RIGHTS"))) {
    issues.push(issue("SOURCE_RIGHTS_AUTHORITY_PARTITION_MISMATCH", "#/authority", "blocked"));
  }
  if (packet.authority.expiresAt !== undefined) {
    const expiresMs = canonicalTimestampMs(packet.authority.expiresAt);
    if (expiresMs === null) issues.push(issue("TIMESTAMP_INVALID", "#/authority/expiresAt"));
    else if (expiresMs <= nowMs) issues.push(issue("AUTHORITY_EXPIRED", "#/authority/expiresAt", "blocked"));
  }
}

function validateGraphStructure(packet, issues, nowMs) {
  const packetObservedMs = canonicalTimestampMs(packet.observedAt);
  if (packetObservedMs === null) issues.push(issue("TIMESTAMP_INVALID", "#/observedAt"));
  else if (packetObservedMs > nowMs) issues.push(issue("TIMESTAMP_FUTURE", "#/observedAt"));

  let previousHash = null;
  let previousTime = -Infinity;
  const receipts = new Set();
  const singletonCounts = new Map();
  for (let index = 0; index < packet.receiptGraph.length; index += 1) {
    const node = packet.receiptGraph[index];
    const pointer = `#/receiptGraph/${index}`;
    if (node.sequence !== index) issues.push(issue("GRAPH_SEQUENCE_INVALID", `${pointer}/sequence`));
    if (node.parentSha256 !== previousHash) issues.push(issue("GRAPH_DIRECT_PARENT_MISMATCH", `${pointer}/parentSha256`));
    if (receipts.has(node.receiptSha256)) issues.push(issue("GRAPH_RECEIPT_REUSED", `${pointer}/receiptSha256`));
    receipts.add(node.receiptSha256);
    previousHash = node.receiptSha256;

    const observedMs = canonicalTimestampMs(node.observedAt);
    if (observedMs === null) issues.push(issue("TIMESTAMP_INVALID", `${pointer}/observedAt`));
    else {
      if (observedMs < previousTime) issues.push(issue("GRAPH_TIME_ORDER_INVALID", `${pointer}/observedAt`));
      if (packetObservedMs !== null && observedMs > packetObservedMs) issues.push(issue("GRAPH_TIME_AFTER_ENVELOPE", `${pointer}/observedAt`));
      if (observedMs > nowMs) issues.push(issue("TIMESTAMP_FUTURE", `${pointer}/observedAt`));
      previousTime = observedMs;
    }

    if (node.subject !== expectedNodeSubject(node.kind)) issues.push(issue("GRAPH_SUBJECT_MISMATCH", `${pointer}/subject`));
    if (SIGNED_KINDS.has(node.kind)) {
      if (node.signatureStatus !== "VERIFIED" || node.signatureAnchorSha256 === null) issues.push(issue("GRAPH_REQUIRED_SIGNATURE_UNVERIFIED", pointer));
    } else if (node.signatureStatus === "MISSING" || node.signatureStatus === "INVALID") {
      issues.push(issue("GRAPH_SIGNATURE_INVALID", `${pointer}/signatureStatus`));
    }
    if (node.signatureStatus === "VERIFIED" && node.signatureAnchorSha256 === null) issues.push(issue("GRAPH_SIGNATURE_ANCHOR_MISSING", `${pointer}/signatureAnchorSha256`));

    if (AUTHORIZATION_KINDS.has(node.kind)) {
      if (node.providerGrantBinding === null || node.expiresAt === null) issues.push(issue("GRAPH_AUTHORIZATION_BINDING_INCOMPLETE", pointer));
    } else {
      if (node.providerGrantBinding !== null) issues.push(issue("GRAPH_GRANT_OUTSIDE_AUTHORIZATION", `${pointer}/providerGrantBinding`));
      if (node.expiresAt !== null) issues.push(issue("GRAPH_EXPIRY_OUTSIDE_AUTHORIZATION", `${pointer}/expiresAt`));
    }
    if (ACTIVITY_EVENT_KINDS.has(node.kind)) {
      if (node.activityEvent === null) issues.push(issue("GRAPH_ACTIVITY_EVENT_MISSING", `${pointer}/activityEvent`));
    } else if (node.activityEvent !== null) {
      issues.push(issue("GRAPH_ACTIVITY_EVENT_UNEXPECTED", `${pointer}/activityEvent`));
    }

    const binding = bindingForReceiptNode(packet, node);
    if (binding === null || node.bindingDigestSha256 !== canonicalDigest(binding)) issues.push(issue("GRAPH_BINDING_DIGEST_MISMATCH", `${pointer}/bindingDigestSha256`));
    const bodyPresent = node.receiptBody !== null && typeof node.receiptBody === "object" && !Array.isArray(node.receiptBody);
    const expectedBody = bodyPresent ? receiptBodyForNode(packet, node) : null;
    if (!bodyPresent || !deepEqual(node.receiptBody, expectedBody)) issues.push(issue("GRAPH_RECEIPT_BODY_MISMATCH", `${pointer}/receiptBody`));
    if (!bodyPresent || node.receiptSha256 !== canonicalDigest(node.receiptBody)) issues.push(issue("GRAPH_RECEIPT_CONTENT_ADDRESS_MISMATCH", `${pointer}/receiptSha256`));
    if (!bodyPresent || node.receiptBody.directParentSha256 !== node.parentSha256) issues.push(issue("GRAPH_RECEIPT_BODY_PARENT_MISMATCH", `${pointer}/receiptBody/directParentSha256`));
    const external = bodyPresent ? node.receiptBody.externalAuthority : null;
    if (external?.verificationStatus === "VERIFIED") {
      const structurallyBound = external.nativeReceiptSha256 !== null
        && external.nativeReceiptRef === `sha256:${external.nativeReceiptSha256}`
        && external.trustAnchorSha256 !== null;
      if (!structurallyBound) issues.push(issue("EXTERNAL_EVIDENCE_DECLARATION_INCOMPLETE", `${pointer}/receiptBody/externalAuthority`));
    } else if (external && (external.nativeReceiptRef !== null || external.nativeReceiptSha256 !== null || external.trustAnchorSha256 !== null)) {
      issues.push(issue("EXTERNAL_EVIDENCE_UNKNOWN_MUST_BE_NULL", `${pointer}/receiptBody/externalAuthority`));
    }
    if (externalEvidenceRequired(packet, node) && node.receiptBody?.externalAuthority?.verificationStatus !== "VERIFIED") {
      issues.push(issue("EXTERNAL_EVIDENCE_NOT_VERIFIED", `${pointer}/receiptBody/externalAuthority`, "blocked"));
    }

    const providerName = node.kind.startsWith("REFERENCE_") ? "reference" : node.kind.startsWith("EVALUATED_") ? "evaluated" : null;
    if (providerName && externalEvidenceRequired(packet, node)) {
      const expectedAnchor = packet[providerName].routeTrustAnchorSha256;
      if (external?.trustAnchorSha256 !== expectedAnchor) issues.push(issue("EXTERNAL_TRUST_ANCHOR_MISMATCH", `${pointer}/receiptBody/externalAuthority/trustAnchorSha256`));
    }

    if (!ACTIVE_EVENT_KINDS.has(node.kind)) {
      singletonCounts.set(node.kind, (singletonCounts.get(node.kind) ?? 0) + 1);
    }
  }
  for (const [kind, count] of singletonCounts) {
    if (count > 1) issues.push(issue("GRAPH_SINGLETON_KIND_REUSED", "#/receiptGraph"));
  }

  const expectedMilestones = milestonesFor(packet);
  const expectedKinds = expectedMilestones.map(([kind]) => kind);
  const actualKinds = packet.receiptGraph.filter((node) => expectedKinds.includes(node.kind)).map((node) => node.kind);
  for (let index = 0; index < actualKinds.length; index += 1) {
    if (actualKinds[index] !== expectedKinds[index]) issues.push(issue("GRAPH_MILESTONE_PREFIX_INVALID", "#/receiptGraph"));
  }
  if (actualKinds.length > expectedKinds.length) issues.push(issue("GRAPH_MILESTONE_OVERFLOW", "#/receiptGraph"));
  for (const node of packet.receiptGraph) {
    if (!expectedKinds.includes(node.kind) && !AUXILIARY_KINDS.has(node.kind)) issues.push(issue("GRAPH_KIND_NOT_IN_ACTIVE_LIFECYCLE", "#/receiptGraph"));
  }
  for (const [reviewKind, reviewArm] of REVIEW_ARM_BY_KIND) {
    const reviewNode = nodeByKind(packet, reviewKind);
    if (!reviewNode || !NEGATIVE_REVIEW_OUTCOMES.has(packet.independentReview[reviewArm].status)) continue;
    if (packet.receiptGraph.some((node) => node.sequence > reviewNode.sequence && expectedKinds.includes(node.kind))) {
      issues.push(issue("REVIEW_NEGATIVE_OUTCOME_HAS_LATER_MILESTONE", `#/independentReview/${reviewArm}`));
    }
  }
  return { expectedMilestones, actualKinds };
}

const RECEIPT_MAPPED_KINDS = [
  "PROTOCOL_REGISTRATION", "PROTOCOL_ACTIVATION", "SOURCE_BASELINE", "MATERIAL_CURRENTNESS", "SOURCE_RIGHTS",
  "FRAME_READINESS", "FRAME_FREEZE", "SAMPLE_FREEZE", "FREEZE_REVIEW", "CUSTODY_HANDOFF",
  "RUNNER_REGISTRATION", "RUNNER_CLOSEOUT", "RUNNER_REVIEW", "REFERENCE_PREFLIGHT", "REFERENCE_ROUTE",
  "REFERENCE_AUTHORIZATION", "REFERENCE_RECONCILIATION", "REFERENCE_LABELING", "REFERENCE_SEAL",
  "EVALUATED_PREFLIGHT", "EVALUATED_ROUTE", "EVALUATED_AUTHORIZATION", "EVALUATED_EXECUTION_REGISTRATION",
  "EVALUATED_CANARY_RECONCILIATION", "EVALUATED_CANARY", "EVALUATED_RUN_RECONCILIATION",
  "EVALUATED_RUN", "ACTIVITY_SUMMARY", "SCORE",
  "RESULT_SEAL", "FINAL_REVIEW", "CLAIM_REVIEW", "AGGREGATE_EXPORT_AUTHORIZATION", "AGGREGATE_EXPORT",
];

function validateReceiptMappings(packet, issues) {
  for (const kind of RECEIPT_MAPPED_KINDS) {
    const nodes = nodesByKind(packet, kind);
    const topReceipt = receiptForKind(packet, kind);
    if (nodes.length === 1 && topReceipt !== nodes[0].receiptSha256) issues.push(issue("RECEIPT_TOP_LEVEL_MISMATCH", "#/receiptGraph"));
    if (nodes.length === 0 && topReceipt !== null) issues.push(issue("RECEIPT_WITHOUT_ACTIVE_NODE", "#/receiptGraph"));
  }
  if (packet.runner.independentReviewReceiptSha256 !== packet.independentReview.runner.receiptSha256) {
    issues.push(issue("RECEIPT_RUNNER_REVIEW_MISMATCH", "#/runner/independentReviewReceiptSha256"));
  }
}

function presentKinds(packet) {
  return new Set(packet.receiptGraph.map((node) => node.kind));
}

function expectedProviderStatus(kinds, prefix) {
  const stages = prefix === "REFERENCE"
    ? [
        ["REFERENCE_PREFLIGHT", "PREFLIGHT_AUTHORIZED"], ["REFERENCE_ROUTE", "ROUTE_TRUSTED"],
        ["REFERENCE_AUTHORIZATION", "EXECUTION_AUTHORIZED"], ["REFERENCE_LABELING", "LABELING_COMPLETE"],
        ["REFERENCE_SEAL", "SEALED"],
      ]
    : [
        ["EVALUATED_PREFLIGHT", "PREFLIGHT_AUTHORIZED"], ["EVALUATED_ROUTE", "ROUTE_TRUSTED"],
        ["EVALUATED_AUTHORIZATION", "EXECUTION_AUTHORIZED"],
        ["EVALUATED_EXECUTION_REGISTRATION", "EXECUTION_REGISTRATION_FROZEN"],
        ["EVALUATED_CANARY", "CANARY_COMPLETE"], ["EVALUATED_RUN", "RUN_COMPLETE"],
      ];
  let status = "NOT_STARTED";
  for (const [kind, candidate] of stages) if (kinds.has(kind)) status = candidate;
  return status;
}

function assertExactStatus(actual, expected, pointer, issues) {
  if (actual !== expected) issues.push(issue("STATUS_GRAPH_PROJECTION_MISMATCH", pointer));
}

function validateReviewProjection(packet, kinds, name, kind, issues) {
  const arm = packet.independentReview[name];
  if (kinds.has(kind)) {
    if (!SIGNED_REVIEW_OUTCOMES.has(arm.status)) {
      issues.push(issue("STATUS_GRAPH_PROJECTION_MISMATCH", `#/independentReview/${name}/status`));
    }
  } else if (!new Set(["PENDING", "BLOCKED"]).has(arm.status)) {
    issues.push(issue("STATUS_GRAPH_PROJECTION_MISMATCH", `#/independentReview/${name}/status`));
  }
  if (arm.status === "PENDING") {
    if (arm.receiptSha256 !== null || arm.signatureStatus !== "MISSING" || arm.identityAnchorSha256 !== null || arm.reviewedBindingsSha256 !== null) {
      issues.push(issue("REVIEW_FUTURE_FIELDS_PRESENT", `#/independentReview/${name}`));
    }
  } else if (arm.status === "BLOCKED" && !kinds.has(kind)) {
    if (arm.receiptSha256 !== null || arm.signatureStatus !== "MISSING" || arm.identityAnchorSha256 !== null || arm.reviewedBindingsSha256 !== null) {
      issues.push(issue("REVIEW_BLOCKED_PROJECTION_INVALID", `#/independentReview/${name}`));
    }
    const prerequisite = new Map([
      ["freeze", "SAMPLE_FREEZE"],
      ["runner", "RUNNER_CLOSEOUT"],
      ["final", "RESULT_SEAL"],
      ["claimBoundary", "FINAL_REVIEW"],
    ]).get(name);
    const prerequisiteConcurred = name !== "runner" && name !== "claimBoundary"
      ? true
      : name === "runner"
        ? packet.independentReview.freeze.status === "CONCURRED"
        : packet.independentReview.final.status === "CONCURRED";
    if (!kinds.has(prerequisite) || !prerequisiteConcurred) {
      issues.push(issue("REVIEW_BLOCKED_NOT_APPLICABLE", `#/independentReview/${name}`));
    }
  }
}

function validateTopLevelProjection(packet, issues) {
  const kinds = presentKinds(packet);
  assertExactStatus(packet.protocol.status, kinds.has("PROTOCOL_ACTIVATION") ? "ACTIVATED" : kinds.has("PROTOCOL_REGISTRATION") ? "REGISTERED" : "UNREGISTERED", "#/protocol/status", issues);
  assertExactStatus(packet.sourceRights.status, kinds.has("REFERENCE_AUTHORIZATION") || kinds.has("EVALUATED_AUTHORIZATION") ? "AUTHORIZED_FOR_PROVIDER_EGRESS" : kinds.has("SOURCE_RIGHTS") ? "AUTHORIZED_FOR_FREEZE" : "NOT_REVIEWED", "#/sourceRights/status", issues);
  assertExactStatus(packet.frame.status, kinds.has("FRAME_FREEZE") ? "FROZEN" : kinds.has("FRAME_READINESS") ? "READINESS_VERIFIED" : "NOT_STARTED", "#/frame/status", issues);
  assertExactStatus(packet.sampleFreeze.status, kinds.has("FREEZE_REVIEW") && packet.independentReview.freeze.status === "CONCURRED" ? "INDEPENDENTLY_VERIFIED" : kinds.has("SAMPLE_FREEZE") ? "FROZEN" : "NOT_STARTED", "#/sampleFreeze/status", issues);
  assertExactStatus(packet.runner.status, kinds.has("RUNNER_REVIEW") && packet.independentReview.runner.status === "CONCURRED" ? "INDEPENDENTLY_VERIFIED" : kinds.has("RUNNER_CLOSEOUT") ? "CLOSEOUT_RECORDED" : kinds.has("RUNNER_REGISTRATION") ? "REGISTERED" : "NOT_STARTED", "#/runner/status", issues);
  assertExactStatus(packet.reference.status, expectedProviderStatus(kinds, "REFERENCE"), "#/reference/status", issues);
  assertExactStatus(packet.evaluated.status, expectedProviderStatus(kinds, "EVALUATED"), "#/evaluated/status", issues);
  validateReviewProjection(packet, kinds, "freeze", "FREEZE_REVIEW", issues);
  validateReviewProjection(packet, kinds, "runner", "RUNNER_REVIEW", issues);
  validateReviewProjection(packet, kinds, "final", "FINAL_REVIEW", issues);
  validateReviewProjection(packet, kinds, "claimBoundary", "CLAIM_REVIEW", issues);

  if (packet.runProvenance === "natural-registered") {
    assertExactStatus(packet.result.status, kinds.has("RESULT_SEAL") ? "SEALED" : kinds.has("SCORE") ? "SCORED" : "NOT_STARTED", "#/result/status", issues);
  } else if (!new Set(["NOT_STARTED", "STRUCTURE_VALIDATED"]).has(packet.result.status)) {
    issues.push(issue("PROVENANCE_SYNTHETIC_RESULT_FORBIDDEN", "#/result/status"));
  }
  assertExactStatus(packet.aggregateExport.status, kinds.has("AGGREGATE_EXPORT") ? "EXPORTED" : kinds.has("AGGREGATE_EXPORT_AUTHORIZATION") ? "AUTHORIZED" : "NOT_REQUESTED", "#/aggregateExport/status", issues);

  const anyGrant = packet.reference.grantBinding !== null || packet.evaluated.grantBinding !== null;
  if (packet.sourceRights.providerEgressAuthorized !== anyGrant || packet.sourceRights.credentialAccessAuthorized !== anyGrant || packet.sourceRights.spendAuthorized !== anyGrant) {
    issues.push(issue("SOURCE_RIGHTS_PROVIDER_PROJECTION_MISMATCH", "#/sourceRights"));
  }
  if (packet.reference.naturalTextEgressAuthorized !== (packet.reference.grantBinding !== null)) issues.push(issue("PROVIDER_EGRESS_PROJECTION_MISMATCH", "#/reference/naturalTextEgressAuthorized"));
  if (packet.evaluated.naturalTextEgressAuthorized !== (packet.evaluated.grantBinding !== null)) issues.push(issue("PROVIDER_EGRESS_PROJECTION_MISMATCH", "#/evaluated/naturalTextEgressAuthorized"));
}

function allNull(values) {
  return values.every((value) => value === null);
}

function validateStageFieldCompleteness(packet, issues) {
  if (packet.protocol.status === "UNREGISTERED") {
    if (!allNull([packet.protocol.logicalId, packet.protocol.registrationSha256, packet.protocol.activationReceiptSha256, packet.protocol.activePointerSha256]) || packet.protocol.immutable) issues.push(issue("PROTOCOL_FUTURE_FIELDS_PRESENT", "#/protocol"));
  } else if (packet.protocol.status === "REGISTERED" && !allNull([packet.protocol.activationReceiptSha256, packet.protocol.activePointerSha256])) {
    issues.push(issue("PROTOCOL_FUTURE_FIELDS_PRESENT", "#/protocol"));
  }

  if (packet.sourceRights.status === "NOT_REVIEWED") {
    if (!allNull([packet.sourceRights.scopeReceiptSha256, packet.sourceRights.sourceScopeSha256, packet.sourceRights.referenceGrantBinding, packet.sourceRights.evaluatedGrantBinding]) || packet.sourceRights.providerEgressAuthorized || packet.sourceRights.credentialAccessAuthorized || packet.sourceRights.spendAuthorized) issues.push(issue("SOURCE_RIGHTS_FUTURE_FIELDS_PRESENT", "#/sourceRights"));
  } else if (packet.sourceRights.status === "AUTHORIZED_FOR_FREEZE") {
    if (
      packet.sourceRights.scopeReceiptSha256 === null
      || packet.sourceRights.sourceScopeSha256 === null
      || packet.sourceRights.referenceGrantBinding !== null
      || packet.sourceRights.evaluatedGrantBinding !== null
      || packet.sourceRights.providerEgressAuthorized
      || packet.sourceRights.credentialAccessAuthorized
      || packet.sourceRights.spendAuthorized
    ) issues.push(issue("SOURCE_RIGHTS_SCOPE_INCOMPLETE", "#/sourceRights", "blocked"));
  } else if (packet.sourceRights.status === "AUTHORIZED_FOR_PROVIDER_EGRESS") {
    if (
      packet.sourceRights.scopeReceiptSha256 === null
      || packet.sourceRights.sourceScopeSha256 === null
      || !packet.sourceRights.providerEgressAuthorized
      || !packet.sourceRights.credentialAccessAuthorized
      || !packet.sourceRights.spendAuthorized
      || (packet.sourceRights.referenceGrantBinding === null && packet.sourceRights.evaluatedGrantBinding === null)
    ) issues.push(issue("SOURCE_RIGHTS_SCOPE_INCOMPLETE", "#/sourceRights", "blocked"));
  }

  if (packet.frame.status === "NOT_STARTED") {
    if (!allNull([packet.frame.readinessReceiptSha256, packet.frame.freezeReceiptSha256, packet.frame.manifestSha256, packet.frame.rowCount, packet.frame.eligibleCount, packet.frame.excludedCount]) || packet.frame.runtimeVisibleScopeBound || packet.frame.syntheticExcluded) issues.push(issue("FRAME_FUTURE_FIELDS_PRESENT", "#/frame"));
  } else if (packet.frame.status === "READINESS_VERIFIED") {
    if (packet.frame.readinessReceiptSha256 === null || packet.frame.manifestSha256 === null || packet.frame.freezeReceiptSha256 !== null || !allNull([packet.frame.rowCount, packet.frame.eligibleCount, packet.frame.excludedCount]) || !packet.frame.runtimeVisibleScopeBound || !packet.frame.syntheticExcluded) issues.push(issue("FRAME_READINESS_FIELDS_INVALID", "#/frame"));
  }

  if (packet.sampleFreeze.status === "NOT_STARTED") {
    const custody = packet.sampleFreeze.custody;
    if (!allNull([packet.sampleFreeze.freezeReceiptSha256, packet.sampleFreeze.sampleManifestSha256, packet.sampleFreeze.homologyManifestSha256, packet.sampleFreeze.sampleSize, custody.metadataReceiptSha256, custody.custodyContextSha256, custody.protectedRootRefSha256]) || packet.sampleFreeze.onePerCluster || packet.sampleFreeze.rerollForbidden || custody.directoryMode !== "UNKNOWN" || custody.filesMode !== "UNKNOWN" || custody.symlinkStatus !== "UNKNOWN") issues.push(issue("SAMPLE_FUTURE_FIELDS_PRESENT", "#/sampleFreeze"));
  }

  if (packet.runner.status === "NOT_STARTED") {
    if (!allNull([packet.runner.registrationSha256, packet.runner.sourceCommit, packet.runner.sourceClosureSha256, packet.runner.closeoutReceiptSha256, packet.runner.independentReviewReceiptSha256, packet.runner.custodyContextSha256]) || packet.runner.reviewDecision !== "NOT_REVIEWED" || packet.runner.tracked || packet.runner.clean) issues.push(issue("RUNNER_FUTURE_FIELDS_PRESENT", "#/runner"));
  } else if (packet.runner.status === "REGISTERED") {
    if (!allNull([packet.runner.closeoutReceiptSha256, packet.runner.independentReviewReceiptSha256]) || packet.runner.reviewDecision !== "NOT_REVIEWED") issues.push(issue("RUNNER_FUTURE_FIELDS_PRESENT", "#/runner"));
  } else if (packet.runner.status === "CLOSEOUT_RECORDED") {
    const reviewStatus = packet.independentReview.runner.status;
    const expectedDecision = NEGATIVE_REVIEW_OUTCOMES.has(reviewStatus) ? reviewStatus : "NOT_REVIEWED";
    const expectedReceipt = NEGATIVE_REVIEW_OUTCOMES.has(reviewStatus) ? packet.independentReview.runner.receiptSha256 : null;
    if (packet.runner.independentReviewReceiptSha256 !== expectedReceipt || packet.runner.reviewDecision !== expectedDecision) issues.push(issue("RUNNER_FUTURE_FIELDS_PRESENT", "#/runner"));
  }

  if (["NOT_STARTED", "STRUCTURE_VALIDATED"].includes(packet.result.status)) {
    if (!allNull([packet.result.scoreReceiptSha256, packet.result.resultReceiptSha256, packet.result.currentBindingsSha256, packet.result.registeredInferenceFrameSha256, packet.result.metrics.metricsManifestSha256, packet.result.metrics.sampleSize, packet.result.metrics.successfulCount, packet.result.metrics.failedCount]) || packet.result.resultConclusion !== "NO_EVALUATION_CLAIM") issues.push(issue("RESULT_FUTURE_FIELDS_PRESENT", "#/result"));
  } else if (packet.result.status === "SCORED" && packet.result.resultReceiptSha256 !== null) {
    issues.push(issue("RESULT_FUTURE_FIELDS_PRESENT", "#/result"));
  }
}

function validateFrameAndRunner(packet, issues, lifecycleState) {
  if (lifecycleState !== "UNREGISTERED" && (packet.repository.head === null || packet.repository.branch === null || packet.repository.clean === null)) {
    issues.push(issue("REPOSITORY_IDENTITY_INCOMPLETE", "#/repository", "blocked"));
  }
  if (packet.protocol.status !== "UNREGISTERED") {
    if (packet.protocol.logicalId === null || packet.protocol.registrationSha256 === null || !packet.protocol.immutable) issues.push(issue("PROTOCOL_REGISTRATION_INCOMPLETE", "#/protocol"));
  }
  if (packet.protocol.status === "ACTIVATED" && (packet.protocol.activationReceiptSha256 === null || packet.protocol.activePointerSha256 === null)) issues.push(issue("PROTOCOL_ACTIVATION_INCOMPLETE", "#/protocol"));
  if (packet.frame.status === "FROZEN") {
    const counts = [packet.frame.rowCount, packet.frame.eligibleCount, packet.frame.excludedCount];
    if (!counts.every(Number.isInteger) || packet.frame.manifestSha256 === null || packet.frame.freezeReceiptSha256 === null) issues.push(issue("FRAME_FROZEN_FIELDS_INCOMPLETE", "#/frame"));
    else if (packet.frame.rowCount !== packet.frame.eligibleCount + packet.frame.excludedCount) issues.push(issue("FRAME_COUNT_MISMATCH", "#/frame"));
    if (!packet.frame.runtimeVisibleScopeBound || !packet.frame.syntheticExcluded) issues.push(issue("FRAME_SCOPE_INCOMPLETE", "#/frame"));
  }
  if (packet.sampleFreeze.status !== "NOT_STARTED") {
    if (packet.sampleFreeze.sampleManifestSha256 === null || packet.sampleFreeze.homologyManifestSha256 === null || !Number.isInteger(packet.sampleFreeze.sampleSize)) issues.push(issue("SAMPLE_FREEZE_FIELDS_INCOMPLETE", "#/sampleFreeze"));
    if (!packet.sampleFreeze.onePerCluster || !packet.sampleFreeze.rerollForbidden) issues.push(issue("SAMPLE_FREEZE_INVARIANT_MISSING", "#/sampleFreeze"));
    if (Number.isInteger(packet.frame.eligibleCount) && Number.isInteger(packet.sampleFreeze.sampleSize) && packet.sampleFreeze.sampleSize > packet.frame.eligibleCount) issues.push(issue("SAMPLE_SIZE_EXCEEDS_FRAME", "#/sampleFreeze/sampleSize"));
    const custody = packet.sampleFreeze.custody;
    if (custody.metadataReceiptSha256 === null || custody.custodyContextSha256 === null || custody.protectedRootRefSha256 === null || custody.directoryMode !== "MODE_0700_VERIFIED" || custody.filesMode !== "MODE_0600_VERIFIED" || custody.symlinkStatus !== "SYMLINK_FREE_VERIFIED") {
      issues.push(issue("PROTECTED_CUSTODY_INVALID", "#/sampleFreeze/custody", "blocked"));
    }
  }
  if (packet.runner.status !== "NOT_STARTED") {
    if (packet.runner.registrationSha256 === null || packet.runner.sourceCommit === null || packet.runner.sourceClosureSha256 === null || packet.runner.custodyContextSha256 === null) issues.push(issue("RUNNER_REGISTRATION_INCOMPLETE", "#/runner"));
  }
  if (["CLOSEOUT_RECORDED", "INDEPENDENTLY_VERIFIED"].includes(packet.runner.status) && packet.runner.closeoutReceiptSha256 === null) issues.push(issue("RUNNER_CLOSEOUT_INCOMPLETE", "#/runner"));
  if (packet.runner.status === "INDEPENDENTLY_VERIFIED") {
    if (!packet.runner.tracked || !packet.runner.clean || packet.runner.reviewDecision !== "CONCURRED") issues.push(issue("RUNNER_NOT_CURRENT", "#/runner", "blocked"));
  }
}

function validateCustody(packet, issues) {
  const required = custodyRequired(packet);
  const node = nodeByKind(packet, "CUSTODY_HANDOFF");
  const handoff = packet.runner.custodyHandoff;
  const expectedRelation = required ? "CROSS_CUSTODY" : "SAME_CONTEXT";
  if (handoff.custodyRelation !== expectedRelation) issues.push(issue("CUSTODY_RELATION_MISMATCH", "#/runner/custodyHandoff/custodyRelation"));
  const expectedStatus = required ? (node ? "VERIFIED" : "REQUIRED") : "NOT_REQUIRED";
  assertExactStatus(handoff.status, expectedStatus, "#/runner/custodyHandoff/status", issues);
  if (!required) {
    const nullable = [handoff.handoffReceiptSha256, handoff.sampleManifestSha256, handoff.runnerRegistrationSha256, handoff.runnerClosureSha256, handoff.sourceCustodyRefSha256, handoff.destinationCustodyRefSha256, handoff.signatureAnchorSha256];
    if (nullable.some((value) => value !== null) || handoff.senderRole !== "NOT_APPLICABLE" || handoff.receiverRole !== "NOT_APPLICABLE" || handoff.transferMethod !== "NOT_APPLICABLE" || handoff.directoryModeVerification !== "NOT_APPLICABLE" || handoff.filesModeVerification !== "NOT_APPLICABLE" || handoff.symlinkVerification !== "NOT_APPLICABLE" || handoff.signatureStatus !== "NOT_APPLICABLE") {
      issues.push(issue("CUSTODY_HANDOFF_UNEXPECTED", "#/runner/custodyHandoff"));
    }
    return { required, complete: true };
  }
  if (!node) {
    issues.push(issue("CUSTODY_HANDOFF_REQUIRED", "#/runner/custodyHandoff", "blocked"));
    return { required, complete: false };
  }
  const exact = handoff.status === "VERIFIED"
    && handoff.custodyRelation === "CROSS_CUSTODY"
    && handoff.sampleManifestSha256 === packet.sampleFreeze.sampleManifestSha256
    && handoff.runnerRegistrationSha256 === packet.runner.registrationSha256
    && handoff.runnerClosureSha256 === packet.runner.sourceClosureSha256
    && handoff.sourceCustodyRefSha256 === packet.sampleFreeze.custody.custodyContextSha256
    && handoff.destinationCustodyRefSha256 === packet.runner.custodyContextSha256
    && handoff.senderRole === "SAMPLE_CUSTODIAN"
    && handoff.receiverRole === "RUNNER_CUSTODIAN"
    && ["CONTROLLED_COPY", "CONTROLLED_MOUNT"].includes(handoff.transferMethod)
    && handoff.directoryModeVerification === "MODE_0700_VERIFIED"
    && handoff.filesModeVerification === "MODE_0600_VERIFIED"
    && handoff.symlinkVerification === "SYMLINK_FREE_VERIFIED"
    && handoff.signatureStatus === "VERIFIED"
    && handoff.signatureAnchorSha256 === node.signatureAnchorSha256
    && handoff.handoffReceiptSha256 === node.receiptSha256;
  if (!exact) issues.push(issue("CUSTODY_HANDOFF_BINDING_MISMATCH", "#/runner/custodyHandoff"));
  return { required, complete: exact };
}

function validateCurrentness(packet, issues) {
  const currentness = packet.materialCurrentness;
  const activeNodes = packet.receiptGraph.filter((node) => ACTIVE_EVENT_KINDS.has(node.kind));
  const hasActivity = activeNodes.length > 0;
  if (currentness.hasProviderActivity !== hasActivity) issues.push(issue("CURRENTNESS_ACTIVITY_FLAG_MISMATCH", "#/materialCurrentness/hasProviderActivity"));
  const first = currentness.firstProviderActivity;
  if (hasActivity) {
    const node = activeNodes[0];
    if (first.status !== "OBSERVED" || first.receiptSha256 !== node.receiptSha256 || first.observedAt !== node.observedAt || first.phase !== node.activityEvent.phase) issues.push(issue("CURRENTNESS_FIRST_ACTIVITY_MISMATCH", "#/materialCurrentness/firstProviderActivity"));
  } else if (first.status !== "NONE" || first.receiptSha256 !== null || first.observedAt !== null || first.phase !== "NONE") {
    issues.push(issue("CURRENTNESS_FIRST_ACTIVITY_MISMATCH", "#/materialCurrentness/firstProviderActivity"));
  }

  const registered = currentness.registeredBindings;
  const exactRegistration = registered.protocolRegistrationSha256 === packet.protocol.registrationSha256
    && registered.sampleManifestSha256 === packet.sampleFreeze.sampleManifestSha256
    && registered.runnerRegistrationSha256 === packet.runner.registrationSha256
    && registered.runnerClosureSha256 === packet.runner.sourceClosureSha256
    && registered.runnerCommit === packet.runner.sourceCommit;
  if (!exactRegistration) issues.push(issue("CURRENTNESS_REGISTERED_BINDINGS_MISMATCH", "#/materialCurrentness/registeredBindings"));

  const frame = packet.registeredInferenceFrame;
  const frameExact = frame.protocolRegistrationSha256 === registered.protocolRegistrationSha256
    && frame.sampleManifestSha256 === registered.sampleManifestSha256
    && frame.promptManifestSha256 === registered.promptManifestSha256
    && frame.evidenceSchemaSha256 === registered.evidenceSchemaSha256
    && frame.taxonomySha256 === registered.taxonomySha256
    && frame.runnerClosureSha256 === registered.runnerClosureSha256
    && frame.runnerCommit === registered.runnerCommit
    && frame.scorerSha256 === registered.scorerSha256
    && frame.sampleSize === packet.sampleFreeze.sampleSize
    && frame.designProfileId === packet.protocol.designProfileId
    && frame.registeredPowerArtifactSha256 === packet.protocol.registeredPowerArtifactSha256
    && frame.registeredClaimCeiling === packet.protocol.registeredClaimCeiling;
  if (!frameExact || frame.inferenceFrameSha256 !== canonicalDigest(inferenceFramePayload(frame))) issues.push(issue("INFERENCE_FRAME_BINDING_MISMATCH", "#/registeredInferenceFrame"));

  const bindingsCurrent = deepEqual(registered, currentness.currentBindings);
  const expectedStatus = bindingsCurrent ? "CURRENT" : hasActivity ? "POST_ACTIVITY_DRIFT" : "PRE_ACTIVITY_DRIFT";
  if (currentness.status !== expectedStatus) issues.push(issue("CURRENTNESS_STATUS_MISMATCH", "#/materialCurrentness/status"));
  if (bindingsCurrent) {
    if (currentness.invalidatedRegistrationReceipts.length !== 0) issues.push(issue("CURRENTNESS_INVALIDATION_UNEXPECTED", "#/materialCurrentness/invalidatedRegistrationReceipts"));
  } else {
    const requiredInvalidated = [packet.protocol.registrationSha256, packet.sampleFreeze.freezeReceiptSha256, packet.runner.registrationSha256].filter(Boolean);
    for (const receipt of requiredInvalidated) if (!currentness.invalidatedRegistrationReceipts.includes(receipt)) issues.push(issue("CURRENTNESS_INVALIDATION_INCOMPLETE", "#/materialCurrentness/invalidatedRegistrationReceipts"));
    issues.push(issue("MATERIAL_BINDING_DRIFT", "#/materialCurrentness", "blocked"));
    const staleReuse = packet.reference.grantBinding !== null || packet.evaluated.grantBinding !== null
      || packet.independentReview.freeze.status === "CONCURRED" || packet.independentReview.runner.status === "CONCURRED"
      || packet.result.status === "SCORED" || packet.result.status === "SEALED"
      || packet.independentReview.final.status === "CONCURRED" || packet.independentReview.claimBoundary.status === "CONCURRED"
      || packet.aggregateExport.status !== "NOT_REQUESTED";
    if (staleReuse) issues.push(issue("CURRENTNESS_STALE_ARTIFACT_REUSE", "#/materialCurrentness"));
  }
  return { bindingsCurrent, hasActivity };
}

function validateGrant(packet, name, issues, nowMs) {
  const provider = packet[name];
  const grant = provider.grantBinding;
  const graphKind = name === "reference" ? "REFERENCE_AUTHORIZATION" : "EVALUATED_AUTHORIZATION";
  const expectedRole = name === "reference" ? "REFERENCE_PROVIDER" : "EVALUATED_PROVIDER";
  const expectedPhase = name === "reference" ? "REFERENCE_LABELING" : "EVALUATED_RUN";
  const authorityCode = name === "reference" ? "REFERENCE_PROVIDER_EXECUTION" : "EVALUATED_PROVIDER_EXECUTION";
  const rightsGrant = name === "reference" ? packet.sourceRights.referenceGrantBinding : packet.sourceRights.evaluatedGrantBinding;
  const node = nodeByKind(packet, graphKind);
  if (grant === null) {
    if (rightsGrant !== null || node !== null) issues.push(issue("PROVIDER_GRANT_THREE_WAY_MISMATCH", `#/${name}`));
    return { fresh: false, present: false };
  }
  if (node === null || !deepEqual(grant, rightsGrant) || !deepEqual(grant, node.providerGrantBinding)) issues.push(issue("PROVIDER_GRANT_THREE_WAY_MISMATCH", `#/${name}/grantBinding`));
  const current = packet.materialCurrentness.currentBindings;
  const exactBindings = grant.role === expectedRole
    && grant.phase === expectedPhase
    && grant.routeAnchorSha256 === provider.routeTrustAnchorSha256
    && grant.protocolRegistrationSha256 === current.protocolRegistrationSha256
    && grant.sampleManifestSha256 === current.sampleManifestSha256
    && grant.runnerRegistrationSha256 === current.runnerRegistrationSha256
    && grant.runnerClosureSha256 === current.runnerClosureSha256
    && grant.runnerCommit === current.runnerCommit
    && grant.protocolRegistrationSha256 === packet.protocol.registrationSha256
    && grant.sampleManifestSha256 === packet.sampleFreeze.sampleManifestSha256
    && grant.runnerRegistrationSha256 === packet.runner.registrationSha256
    && grant.runnerClosureSha256 === packet.runner.sourceClosureSha256
    && grant.runnerCommit === packet.runner.sourceCommit
    && grant.privacyRightsScopeSha256 === packet.sourceRights.sourceScopeSha256
    && grant.grantReceiptSha256 === node?.receiptSha256;
  if (!exactBindings) issues.push(issue("PROVIDER_GRANT_BINDING_MISMATCH", `#/${name}/grantBinding`));

  const issuedMs = canonicalTimestampMs(grant.issuedAt);
  const expiresMs = canonicalTimestampMs(grant.expiresAt);
  const nodeMs = node ? canonicalTimestampMs(node.observedAt) : null;
  if (issuedMs === null || expiresMs === null) issues.push(issue("TIMESTAMP_INVALID", `#/${name}/grantBinding`));
  else {
    if (issuedMs > nowMs) issues.push(issue("TIMESTAMP_FUTURE", `#/${name}/grantBinding/issuedAt`));
    if (expiresMs <= issuedMs) issues.push(issue("PROVIDER_GRANT_TIME_ORDER_INVALID", `#/${name}/grantBinding/expiresAt`));
    if (nodeMs !== null && issuedMs > nodeMs) issues.push(issue("PROVIDER_GRANT_ISSUED_AFTER_RECEIPT", `#/${name}/grantBinding/issuedAt`));
    if (nodeMs !== null && expiresMs <= nodeMs) issues.push(issue("PROVIDER_GRANT_EXPIRED_AT_RECEIPT", `#/${name}/grantBinding/expiresAt`));
    const routeMs = canonicalTimestampMs(nodeByKind(packet, name === "reference" ? "REFERENCE_ROUTE" : "EVALUATED_ROUTE")?.observedAt);
    if (routeMs !== null && issuedMs < routeMs) issues.push(issue("PROVIDER_GRANT_ISSUED_BEFORE_ROUTE", `#/${name}/grantBinding/issuedAt`));
  }
  if (node && (node.expiresAt !== grant.expiresAt || node.receiptSha256 !== grant.grantReceiptSha256)) issues.push(issue("PROVIDER_GRANT_NODE_EXPIRY_OR_RECEIPT_MISMATCH", `#/${name}/grantBinding`));
  const fresh = exactBindings && issuedMs !== null && expiresMs !== null && issuedMs <= nowMs && expiresMs > nowMs && packet.materialCurrentness.status === "CURRENT";
  if (!fresh) issues.push(issue("PROVIDER_GRANT_STALE", `#/${name}/grantBinding`, "blocked"));
  if (!packet.authority.required.includes(authorityCode) || !packet.authority.proven.includes(authorityCode) || packet.authority.missing.includes(authorityCode)) issues.push(issue("PROVIDER_GRANT_AUTHORITY_PARTITION_MISMATCH", "#/authority", "blocked"));
  return { fresh, present: true, expiresMs };
}

function validateProviderAuthority(packet, issues, nowMs) {
  const reference = validateGrant(packet, "reference", issues, nowMs);
  const evaluated = validateGrant(packet, "evaluated", issues, nowMs);
  if (packet.mode === "PROVIDER_PREFLIGHT") {
    if (packet.reference.naturalTextEgressAuthorized || packet.evaluated.naturalTextEgressAuthorized || packet.reference.grantBinding !== null || packet.evaluated.grantBinding !== null || packet.sourceRights.providerEgressAuthorized) {
      issues.push(issue("PREFLIGHT_NATURAL_TEXT_EGRESS_FORBIDDEN", "#/mode"));
    }
  }
  if (packet.mode === "EXECUTE_OR_RESUME") {
    if (!reference.present && !evaluated.present) issues.push(issue("EXECUTION_PROVIDER_GRANT_MISSING", "#/authority", "blocked"));
    if (packet.authority.missing.length > 0) issues.push(issue("EXECUTION_AUTHORITY_MISSING", "#/authority", "blocked"));
    if (!packet.repository.clean || !packet.runner.clean || !packet.runner.tracked) issues.push(issue("EXECUTION_SOURCE_NOT_CLEAN_CURRENT", "#/repository", "blocked"));
  }
  const expiries = [reference.expiresMs, evaluated.expiresMs].filter(Number.isFinite);
  if (expiries.length > 0) {
    const minimum = Math.min(...expiries);
    if (canonicalTimestampMs(packet.authority.expiresAt) !== minimum) issues.push(issue("AUTHORITY_EXPIRY_GRANT_MISMATCH", "#/authority/expiresAt"));
  }
  return { anyExpiredOrStale: (reference.present && !reference.fresh) || (evaluated.present && !evaluated.fresh) };
}

const EVENT_EXPECTATIONS = new Map([
  ["REFERENCE_RESERVATION", ["REFERENCE_LABELING", "RESERVATION"]],
  ["REFERENCE_ATTEMPT", ["REFERENCE_LABELING", "ATTEMPT"]],
  ["REFERENCE_COMPLETION", ["REFERENCE_LABELING", "COMPLETION"]],
  ["REFERENCE_EGRESS", ["REFERENCE_LABELING", "EGRESS"]],
  ["REFERENCE_RECONCILIATION", ["REFERENCE_LABELING", "RECONCILIATION"]],
  ["EVALUATED_CANARY_RESERVATION", ["EVALUATED_CANARY", "RESERVATION"]],
  ["EVALUATED_CANARY_ATTEMPT", ["EVALUATED_CANARY", "ATTEMPT"]],
  ["EVALUATED_CANARY_COMPLETION", ["EVALUATED_CANARY", "COMPLETION"]],
  ["EVALUATED_CANARY_EGRESS", ["EVALUATED_CANARY", "EGRESS"]],
  ["EVALUATED_CANARY_RECONCILIATION", ["EVALUATED_CANARY", "RECONCILIATION"]],
  ["EVALUATED_RUN_RESERVATION", ["EVALUATED_RUN", "RESERVATION"]],
  ["EVALUATED_RUN_ATTEMPT", ["EVALUATED_RUN", "ATTEMPT"]],
  ["EVALUATED_RUN_COMPLETION", ["EVALUATED_RUN", "COMPLETION"]],
  ["EVALUATED_RUN_EGRESS", ["EVALUATED_RUN", "EGRESS"]],
  ["EVALUATED_RUN_RECONCILIATION", ["EVALUATED_RUN", "RECONCILIATION"]],
]);

const RECONCILIATION_KIND_BY_PHASE = new Map([
  ["REFERENCE_LABELING", "REFERENCE_RECONCILIATION"],
  ["EVALUATED_CANARY", "EVALUATED_CANARY_RECONCILIATION"],
  ["EVALUATED_RUN", "EVALUATED_RUN_RECONCILIATION"],
]);

function validateEventGrammar(node, issues, pointer) {
  const [phase, eventType] = EVENT_EXPECTATIONS.get(node.kind);
  const event = node.activityEvent;
  if (event.phase !== phase || event.eventType !== eventType) issues.push(issue("ACTIVITY_EVENT_KIND_MISMATCH", pointer));
  const deltaKeys = ["reservationsDelta", "attemptsDelta", "completedCallsDelta", "egressDelta"];
  if (eventType === "RESERVATION" && (event.reservationsDelta < 1 || deltaKeys.slice(1).some((key) => event[key] !== 0) || event.tokensDelta !== 0 || event.costUsdDelta !== 0 || event.concurrencyObserved !== 0)) issues.push(issue("ACTIVITY_RESERVATION_EVENT_INVALID", pointer));
  if (eventType === "ATTEMPT" && (event.attemptsDelta < 1 || event.reservationsDelta !== 0 || event.completedCallsDelta !== 0 || event.egressDelta !== 0 || event.tokensDelta !== 0 || event.costUsdDelta !== 0 || event.concurrencyObserved < 1)) issues.push(issue("ACTIVITY_ATTEMPT_EVENT_INVALID", pointer));
  if (eventType === "COMPLETION" && (event.completedCallsDelta < 1 || event.reservationsDelta !== 0 || event.attemptsDelta !== 0 || event.egressDelta !== 0 || event.concurrencyObserved !== 0)) issues.push(issue("ACTIVITY_COMPLETION_EVENT_INVALID", pointer));
  if (eventType === "EGRESS" && (event.egressDelta < 1 || event.reservationsDelta !== 0 || event.attemptsDelta !== 0 || event.completedCallsDelta !== 0 || event.tokensDelta !== 0 || event.costUsdDelta !== 0 || event.concurrencyObserved !== 0)) issues.push(issue("ACTIVITY_EGRESS_EVENT_INVALID", pointer));
  if (eventType === "RECONCILIATION" && (deltaKeys.some((key) => event[key] !== 0) || event.tokensDelta !== 0 || event.costUsdDelta !== 0 || event.concurrencyObserved !== 0)) issues.push(issue("ACTIVITY_RECONCILIATION_EVENT_INVALID", pointer));
}

function phaseEventSummary(packet, phase, issues) {
  const nodes = packet.receiptGraph.filter((node) => node.activityEvent?.phase === phase);
  const summary = { reservations: 0, attempts: 0, completedCalls: 0, egress: 0, tokens: 0, costUsd: 0, peakConcurrency: 0 };
  let reconciled = false;
  for (const node of nodes) {
    const pointer = `#/receiptGraph/${node.sequence}`;
    validateEventGrammar(node, issues, pointer);
    const event = node.activityEvent;
    if (reconciled) issues.push(issue("ACTIVITY_CAUSAL_PREFIX_INVALID", pointer));
    summary.reservations += event.reservationsDelta;
    summary.attempts += event.attemptsDelta;
    summary.completedCalls += event.completedCallsDelta;
    summary.egress += event.egressDelta;
    summary.tokens += event.tokensDelta;
    summary.costUsd += event.costUsdDelta;
    summary.peakConcurrency = Math.max(summary.peakConcurrency, event.concurrencyObserved);
    if (summary.attempts > summary.reservations
        || summary.completedCalls > summary.attempts
        || summary.egress > summary.attempts) {
      issues.push(issue("ACTIVITY_CAUSAL_PREFIX_INVALID", pointer));
    }
    if (event.eventType === "RECONCILIATION") reconciled = true;
  }
  const reconcileKind = RECONCILIATION_KIND_BY_PHASE.get(phase);
  return { nodes, summary, reconciliation: nodeByKind(packet, reconcileKind) };
}

function validatePhaseUsage(packet, name, phase, grant, issues) {
  const usage = packet.activity[name];
  const derived = phaseEventSummary(packet, phase, issues);
  const active = derived.nodes.some((node) => ACTIVE_EVENT_KINDS.has(node.kind));
  const reserved = derived.nodes.some((node) => node.activityEvent.eventType === "RESERVATION");
  const expectedStatus = derived.reconciliation ? "RECONCILED" : active || reserved ? "RESERVED" : "NOT_STARTED";
  assertExactStatus(usage.status, expectedStatus, `#/activity/${name}/status`, issues);
  if (usage.phase !== phase) issues.push(issue("ACTIVITY_PHASE_MISMATCH", `#/activity/${name}/phase`));
  const keys = ["reservations", "attempts", "completedCalls", "egress", "tokens", "costUsd", "peakConcurrency"];
  if (derived.reconciliation) {
    if (usage.reconciliationReceiptSha256 !== derived.reconciliation.receiptSha256) issues.push(issue("ACTIVITY_RECONCILIATION_RECEIPT_MISMATCH", `#/activity/${name}`));
    for (const key of keys) {
      const metric = usage[key];
      if (!metric.known || metric.value !== derived.summary[key] || metric.receiptSha256 !== derived.reconciliation.receiptSha256) issues.push(issue("ACTIVITY_RECONCILED_METRIC_MISMATCH", `#/activity/${name}/${key}`));
    }
  } else {
    if (usage.reconciliationReceiptSha256 !== null) issues.push(issue("ACTIVITY_RECONCILIATION_WITHOUT_NODE", `#/activity/${name}`));
    for (const key of keys) {
      const metric = usage[key];
      if (metric.known || metric.value !== null || metric.receiptSha256 !== null) issues.push(issue("ACTIVITY_UNKNOWN_METRIC_MUST_BE_NULL", `#/activity/${name}/${key}`));
    }
  }
  if (derived.summary.completedCalls > derived.summary.attempts || derived.summary.egress > derived.summary.attempts || derived.summary.attempts > derived.summary.reservations) issues.push(issue("ACTIVITY_COUNTER_ORDER_INVALID", `#/activity/${name}`));
  if (active && grant === null) issues.push(issue("ACTIVITY_WITHOUT_PROVIDER_GRANT", `#/activity/${name}`));
  if (grant !== null) {
    const caps = grant.caps;
    if (derived.summary.reservations > caps.attemptCap || derived.summary.attempts > caps.attemptCap || derived.summary.egress > caps.attemptCap || derived.summary.tokens > caps.tokenCap || derived.summary.costUsd > caps.currencyCapUsd || derived.summary.peakConcurrency > caps.concurrencyCap) issues.push(issue("ACTIVITY_CAP_EXCEEDED", `#/activity/${name}`, "blocked"));
  }
  return { ...derived, active };
}

function validateActivityOrdering(packet, issues) {
  const indexOf = (kind) => packet.receiptGraph.findIndex((node) => node.kind === kind);
  const runnerReviewIndex = indexOf("RUNNER_REVIEW");
  const scoreIndex = indexOf("SCORE");
  for (const node of packet.receiptGraph.filter((entry) => ACTIVITY_EVENT_KINDS.has(entry.kind))) {
    if (runnerReviewIndex < 0 || node.sequence <= runnerReviewIndex || (scoreIndex >= 0 && node.sequence >= scoreIndex)) issues.push(issue("ACTIVITY_EVENT_SEQUENCE_INVALID", `#/receiptGraph/${node.sequence}`));
    const phase = node.activityEvent.phase;
    const isReference = phase === "REFERENCE_LABELING";
    const authIndex = indexOf(isReference ? "REFERENCE_AUTHORIZATION" : "EVALUATED_AUTHORIZATION");
    const openIndex = indexOf(phase === "REFERENCE_LABELING"
      ? "REFERENCE_AUTHORIZATION"
      : phase === "EVALUATED_CANARY"
        ? "EVALUATED_EXECUTION_REGISTRATION"
        : "EVALUATED_CANARY");
    const closeIndex = indexOf(phase === "REFERENCE_LABELING"
      ? "REFERENCE_LABELING"
      : phase === "EVALUATED_CANARY"
        ? "EVALUATED_CANARY"
        : "EVALUATED_RUN");
    const nonzero = ACTIVE_EVENT_KINDS.has(node.kind);
    const phaseHasExecutionBoundary = nonzero || closeIndex >= 0;
    if (phaseHasExecutionBoundary && (authIndex < 0 || openIndex < 0 || node.sequence <= openIndex || (closeIndex >= 0 && node.sequence >= closeIndex))) {
      const code = phase === "EVALUATED_RUN"
        ? "EVALUATED_FULL_RUN_ACTIVITY_SEQUENCE_INVALID"
        : "ACTIVITY_PROVIDER_SEQUENCE_INVALID";
      issues.push(issue(code, `#/receiptGraph/${node.sequence}`));
    } else if (nonzero && node.sequence <= authIndex) {
      issues.push(issue("ACTIVITY_PROVIDER_SEQUENCE_INVALID", `#/receiptGraph/${node.sequence}`));
    }
  }
  const currentnessNode = nodeByKind(packet, "MATERIAL_CURRENTNESS");
  if (currentnessNode && (runnerReviewIndex < 0 || currentnessNode.sequence <= runnerReviewIndex || (scoreIndex >= 0 && currentnessNode.sequence >= scoreIndex))) issues.push(issue("CURRENTNESS_RECEIPT_SEQUENCE_INVALID", "#/receiptGraph"));
  const summaryNode = nodeByKind(packet, "ACTIVITY_SUMMARY");
  if (summaryNode) {
    const reconciliations = [
      indexOf("REFERENCE_RECONCILIATION"),
      indexOf("EVALUATED_CANARY_RECONCILIATION"),
      indexOf("EVALUATED_RUN_RECONCILIATION"),
    ];
    if (reconciliations.some((index) => index < 0 || index >= summaryNode.sequence) || (scoreIndex >= 0 && summaryNode.sequence >= scoreIndex)) issues.push(issue("ACTIVITY_SUMMARY_SEQUENCE_INVALID", "#/receiptGraph"));
  }
  for (const [phase, reconciliationKind] of RECONCILIATION_KIND_BY_PHASE) {
    const reconciliation = nodeByKind(packet, reconciliationKind);
    if (!reconciliation) continue;
    const laterActive = packet.receiptGraph.some((node) => node.activityEvent?.phase === phase
      && ACTIVE_EVENT_KINDS.has(node.kind)
      && node.sequence >= reconciliation.sequence);
    if (laterActive) issues.push(issue("ACTIVITY_RECONCILIATION_NOT_CURRENT", "#/receiptGraph"));
  }
  if (scoreIndex >= 0) {
    const evaluatedRun = indexOf("EVALUATED_RUN");
    if (!summaryNode || evaluatedRun < 0 || summaryNode.sequence <= evaluatedRun || summaryNode.sequence >= scoreIndex) issues.push(issue("SCORE_REQUIRES_CURRENT_ACTIVITY_SUMMARY", "#/receiptGraph"));
  }
}

function validateActivity(packet, issues) {
  validateActivityOrdering(packet, issues);
  const reference = validatePhaseUsage(packet, "reference", "REFERENCE_LABELING", packet.reference.grantBinding, issues);
  const evaluatedCanary = validatePhaseUsage(packet, "evaluatedCanary", "EVALUATED_CANARY", packet.evaluated.grantBinding, issues);
  const evaluatedRun = validatePhaseUsage(packet, "evaluatedRun", "EVALUATED_RUN", packet.evaluated.grantBinding, issues);
  const summaryNode = nodeByKind(packet, "ACTIVITY_SUMMARY");
  const overall = {
    attempts: reference.summary.attempts + evaluatedCanary.summary.attempts + evaluatedRun.summary.attempts,
    completedCalls: reference.summary.completedCalls + evaluatedCanary.summary.completedCalls + evaluatedRun.summary.completedCalls,
    egress: reference.summary.egress + evaluatedCanary.summary.egress + evaluatedRun.summary.egress,
  };
  for (const key of ["attempts", "completedCalls", "egress"]) {
    const counter = packet.activity[key];
    if (summaryNode) {
      if (!counter.known || counter.count !== overall[key] || counter.receiptSha256 !== summaryNode.receiptSha256) issues.push(issue("ACTIVITY_SUMMARY_COUNTER_MISMATCH", `#/activity/${key}`));
    } else if (counter.known || counter.count !== null || counter.receiptSha256 !== null) {
      issues.push(issue("ACTIVITY_COUNTER_WITHOUT_SUMMARY", `#/activity/${key}`));
    }
  }
  const unresolved = [reference, evaluatedCanary, evaluatedRun]
    .some((phase) => phase.nodes.length > 0 && !phase.reconciliation);
  if (unresolved) {
    if (!packet.activity.unknown.present || packet.activity.unknown.categories.length === 0 || packet.activity.unknown.reconciliationReceiptSha256 !== null) issues.push(issue("ACTIVITY_UNKNOWN_DECLARATION_INVALID", "#/activity/unknown", "blocked"));
    const requiredCategories = deriveUnknownActivityCategories(packet);
    const declaredCategories = new Set(packet.activity.unknown.categories);
    if (requiredCategories.some((category) => !declaredCategories.has(category))) {
      issues.push(issue("ACTIVITY_UNKNOWN_CATEGORIES_INCOMPLETE", "#/activity/unknown/categories", "blocked"));
    }
    if (packet.activity.unknown.categories.some((category) => !requiredCategories.includes(category))) {
      issues.push(issue("ACTIVITY_UNKNOWN_CATEGORIES_UNSUPPORTED", "#/activity/unknown/categories"));
    }
  } else {
    if (packet.activity.unknown.present || packet.activity.unknown.categories.length > 0 || packet.activity.unknown.reconciliationReceiptSha256 !== (summaryNode?.receiptSha256 ?? null)) issues.push(issue("ACTIVITY_RESOLVED_DECLARATION_INVALID", "#/activity/unknown"));
  }
  const kinds = presentKinds(packet);
  const referenceTerminal = ["REFERENCE_LABELING", "REFERENCE_SEAL", "EVALUATED_PREFLIGHT", "EVALUATED_ROUTE", "EVALUATED_AUTHORIZATION", "EVALUATED_EXECUTION_REGISTRATION", "EVALUATED_CANARY", "EVALUATED_RUN", "SCORE", "RESULT_SEAL", "FINAL_REVIEW", "CLAIM_REVIEW", "AGGREGATE_EXPORT_AUTHORIZATION", "AGGREGATE_EXPORT"].some((kind) => kinds.has(kind));
  const canaryTerminal = ["EVALUATED_CANARY", "EVALUATED_RUN", "SCORE", "RESULT_SEAL", "FINAL_REVIEW", "CLAIM_REVIEW", "AGGREGATE_EXPORT_AUTHORIZATION", "AGGREGATE_EXPORT"].some((kind) => kinds.has(kind));
  const fullRunTerminal = ["EVALUATED_RUN", "SCORE", "RESULT_SEAL", "FINAL_REVIEW", "CLAIM_REVIEW", "AGGREGATE_EXPORT_AUTHORIZATION", "AGGREGATE_EXPORT"].some((kind) => kinds.has(kind));
  const assertExecutedPhase = (derived, phaseName, terminalKind, code = "PROVIDER_TERMINAL_ACTIVITY_PROOF_INCOMPLETE") => {
    const eventTypes = new Set(derived.nodes.map((node) => node.activityEvent?.eventType));
    const completeProtocol = ["RESERVATION", "ATTEMPT", "COMPLETION", "EGRESS", "RECONCILIATION"].every((type) => eventTypes.has(type));
    const positiveAndConsistent = derived.summary.reservations > 0
      && derived.summary.reservations === derived.summary.attempts
      && derived.summary.attempts === derived.summary.completedCalls
      && derived.summary.completedCalls === derived.summary.egress;
    const terminal = nodeByKind(packet, terminalKind);
    const reconciliationCurrent = derived.reconciliation !== null
      && terminal !== null
      && derived.reconciliation.sequence < terminal.sequence
      && !derived.nodes.some((node) => ACTIVE_EVENT_KINDS.has(node.kind) && node.sequence > derived.reconciliation.sequence);
    if (!completeProtocol || !positiveAndConsistent || !reconciliationCurrent) {
      issues.push(issue(code, `#/activity/${phaseName}`));
    }
  };
  if (referenceTerminal) assertExecutedPhase(reference, "reference", "REFERENCE_LABELING");
  if (canaryTerminal) assertExecutedPhase(
    evaluatedCanary,
    "evaluatedCanary",
    "EVALUATED_CANARY",
    "EVALUATED_CANARY_ACTIVITY_PROOF_INCOMPLETE",
  );
  if (fullRunTerminal) assertExecutedPhase(
    evaluatedRun,
    "evaluatedRun",
    "EVALUATED_RUN",
    "EVALUATED_FULL_RUN_ACTIVITY_PROOF_INCOMPLETE",
  );
  if (packet.evaluated.grantBinding !== null) {
    const combined = Object.fromEntries(
      ["reservations", "attempts", "completedCalls", "egress", "tokens", "costUsd"]
        .map((key) => [key, evaluatedCanary.summary[key] + evaluatedRun.summary[key]]),
    );
    combined.peakConcurrency = Math.max(evaluatedCanary.summary.peakConcurrency, evaluatedRun.summary.peakConcurrency);
    const caps = packet.evaluated.grantBinding.caps;
    if (combined.reservations > caps.attemptCap || combined.attempts > caps.attemptCap
        || combined.egress > caps.attemptCap || combined.tokens > caps.tokenCap
        || combined.costUsd > caps.currencyCapUsd || combined.peakConcurrency > caps.concurrencyCap) {
      issues.push(issue("ACTIVITY_CAP_EXCEEDED", "#/activity/evaluatedRun", "blocked"));
    }
  }
  if (["SCORE", "RESULT_SEAL", "FINAL_REVIEW", "CLAIM_REVIEW", "AGGREGATE_EXPORT_AUTHORIZATION", "AGGREGATE_EXPORT"].some((kind) => kinds.has(kind))) {
    if (!summaryNode || packet.activity.unknown.present || !packet.activity.attempts.known || packet.activity.attempts.count <= 0
      || !packet.activity.completedCalls.known || packet.activity.completedCalls.count <= 0
      || !packet.activity.egress.known || packet.activity.egress.count <= 0) {
      issues.push(issue("RESULT_REVIEW_EXPORT_REQUIRES_POSITIVE_ACTIVITY", "#/activity"));
    }
  }
  return { unresolved, hasProviderActivity: reference.active || evaluatedCanary.active || evaluatedRun.active };
}

function validateReviews(packet, issues) {
  const mapping = [
    ["freeze", "FREEZE_REVIEW"], ["runner", "RUNNER_REVIEW"], ["final", "FINAL_REVIEW"], ["claimBoundary", "CLAIM_REVIEW"],
  ];
  for (const [name, kind] of mapping) {
    const arm = packet.independentReview[name];
    const node = nodeByKind(packet, kind);
    if (!SIGNED_REVIEW_OUTCOMES.has(arm.status) || node === null) continue;
    const expectedBindings = reviewExpectation(packet, name);
    if (arm.signatureStatus !== "VERIFIED" || node === null || node.signatureStatus !== "VERIFIED" || arm.receiptSha256 !== node.receiptSha256 || arm.identityAnchorSha256 !== node.signatureAnchorSha256 || arm.reviewedBindingsSha256 !== expectedBindings) issues.push(issue("REVIEW_BINDING_OR_SIGNATURE_INVALID", `#/independentReview/${name}`));
  }
  const roleAnchoredNodes = packet.receiptGraph.filter((node) => typeof node.receiptBody?.signer?.roleAnchor === "string");
  const reviewerAnchors = roleAnchoredNodes
    .filter((node) => node.receiptBody.signer.roleAnchor.endsWith("_REVIEWER"))
    .map((node) => node.signatureAnchorSha256)
    .filter(Boolean);
  if (new Set(reviewerAnchors).size !== reviewerAnchors.length) issues.push(issue("REVIEWER_INDEPENDENCE_ANCHOR_REUSED", "#/independentReview"));
  const authorizationAnchors = roleAnchoredNodes
    .filter((node) => node.receiptBody.signer.roleAnchor.endsWith("_AUTHORIZER"))
    .map((node) => node.signatureAnchorSha256)
    .filter(Boolean);
  if (reviewerAnchors.some((anchor) => authorizationAnchors.includes(anchor))) issues.push(issue("REVIEWER_AUTHORIZER_ROLE_COLLISION", "#/independentReview"));
  const expectedRunnerDecision = SIGNED_REVIEW_OUTCOMES.has(packet.independentReview.runner.status)
    ? packet.independentReview.runner.status
    : "NOT_REVIEWED";
  if (packet.runner.reviewDecision !== expectedRunnerDecision) issues.push(issue("RUNNER_REVIEW_DECISION_MISMATCH", "#/runner/reviewDecision"));
}

const CLAIM_RANK = new Map([
  ["NO_EVALUATION_CLAIM", 0], ["INCONCLUSIVE_MACHINE_REFERENCE", 1], ["AGGREGATE_MACHINE_REFERENCE_ONLY", 2],
]);

function validateResultAndExport(packet, issues) {
  if (packet.result.provenance !== packet.runProvenance || packet.result.metrics.provenance !== packet.runProvenance) issues.push(issue("RESULT_PROVENANCE_MISMATCH", "#/result"));
  const currentDigest = canonicalDigest(packet.materialCurrentness.currentBindings);
  if (["SCORED", "SEALED"].includes(packet.result.status)) {
    if (packet.result.currentBindingsSha256 !== currentDigest || packet.result.registeredInferenceFrameSha256 !== packet.registeredInferenceFrame.inferenceFrameSha256) issues.push(issue("RESULT_BINDING_MISMATCH", "#/result"));
    const metrics = packet.result.metrics;
    if (metrics.metricsManifestSha256 === null || ![metrics.sampleSize, metrics.successfulCount, metrics.failedCount].every(Number.isInteger) || metrics.sampleSize !== metrics.successfulCount + metrics.failedCount || metrics.sampleSize !== packet.sampleFreeze.sampleSize) issues.push(issue("RESULT_METRICS_INVALID", "#/result/metrics"));
  }
  if (CLAIM_RANK.get(packet.result.resultConclusion) > CLAIM_RANK.get(packet.claimCeiling) || CLAIM_RANK.get(packet.claimCeiling) > CLAIM_RANK.get(packet.protocol.registeredClaimCeiling)) issues.push(issue("RESULT_CONCLUSION_EXCEEDS_CLAIM_CEILING", "#/result/resultConclusion"));
  if (packet.claimCeiling !== packet.protocol.registeredClaimCeiling) issues.push(issue("CLAIM_CEILING_REGISTRATION_MISMATCH", "#/claimCeiling"));
  if (
    packet.protocol.status === "UNREGISTERED"
    && (
      packet.claimCeiling !== "NO_EVALUATION_CLAIM"
      || packet.protocol.registeredClaimCeiling !== "NO_EVALUATION_CLAIM"
      || packet.registeredInferenceFrame.registeredClaimCeiling !== "NO_EVALUATION_CLAIM"
    )
  ) {
    issues.push(issue("UNREGISTERED_CLAIM_CEILING_FORBIDDEN", "#/claimCeiling"));
  }

  if (packet.runProvenance === "synthetic-fixture") {
    const forbidden = packet.resolvedState === "CLOSED" || nodeByKind(packet, "SCORE") || nodeByKind(packet, "RESULT_SEAL") || nodeByKind(packet, "FINAL_REVIEW") || nodeByKind(packet, "CLAIM_REVIEW") || packet.aggregateExport.status !== "NOT_REQUESTED" || packet.result.resultConclusion !== "NO_EVALUATION_CLAIM" || packet.claimCeiling !== "NO_EVALUATION_CLAIM";
    if (forbidden) issues.push(issue("PROVENANCE_SYNTHETIC_NATURAL_CLOSURE_FORBIDDEN", "#/runProvenance"));
  }

  if (["AUTHORIZED", "EXPORTED"].includes(packet.aggregateExport.status)) {
    const claimBinding = reviewExpectation(packet, "claimBoundary");
    const exact = packet.runProvenance === "natural-registered"
      && packet.result.status === "SEALED"
      && packet.independentReview.final.status === "CONCURRED"
      && packet.independentReview.claimBoundary.status === "CONCURRED"
      && packet.aggregateExport.resultReceiptSha256 === packet.result.resultReceiptSha256
      && packet.aggregateExport.claimBindingSha256 === claimBinding
      && packet.aggregateExport.metricsProvenance === "natural-registered"
      && packet.aggregateExport.aggregateMetricsSha256 === canonicalDigest({
        resultMetricsManifestSha256: packet.result.metrics.metricsManifestSha256,
        resultConclusion: packet.result.resultConclusion,
        sampleSize: packet.result.metrics.sampleSize,
        successfulCount: packet.result.metrics.successfulCount,
        failedCount: packet.result.metrics.failedCount,
      })
      && packet.aggregateExport.allowlistValidated
      && packet.aggregateExport.publicationAuthorized;
    if (!exact) issues.push(issue("AGGREGATE_EXPORT_BINDING_INVALID", "#/aggregateExport"));
    if (!packet.authority.required.includes("AGGREGATE_EXPORT") || !packet.authority.proven.includes("AGGREGATE_EXPORT") || packet.authority.missing.includes("AGGREGATE_EXPORT")) issues.push(issue("AGGREGATE_EXPORT_AUTHORITY_MISSING", "#/authority", "blocked"));
  } else if (packet.aggregateExport.resultReceiptSha256 !== null || packet.aggregateExport.claimBindingSha256 !== null || packet.aggregateExport.metricsProvenance !== "NONE" || packet.aggregateExport.aggregateMetricsSha256 !== null || packet.aggregateExport.allowlistValidated || packet.aggregateExport.publicationAuthorized) {
    issues.push(issue("AGGREGATE_FUTURE_FIELDS_PRESENT", "#/aggregateExport"));
  }
}

function lifecycleFromGraph(packet, graph) {
  if (Object.values(packet.independentReview).some((arm) => NEGATIVE_REVIEW_OUTCOMES.has(arm.status))) {
    return { lifecycleState: "UNREVIEWABLE", nextAllowedAction: "STOP_BLOCKED" };
  }
  if (graph.actualKinds.length === 0) return { lifecycleState: "UNREGISTERED", nextAllowedAction: "REGISTER_PROTOCOL" };
  const lastKind = graph.actualKinds[graph.actualKinds.length - 1];
  const definition = graph.expectedMilestones.find(([kind]) => kind === lastKind);
  let lifecycleState = definition?.[1] ?? "UNREGISTERED";
  let nextAllowedAction = definition?.[2] ?? "REGISTER_PROTOCOL";
  if (lastKind === "RUNNER_REVIEW" && custodyRequired(packet)) nextAllowedAction = "CREATE_CONTROLLED_CUSTODY_HANDOFF";
  if (lastKind === "EVALUATED_RUN" && nodeByKind(packet, "ACTIVITY_SUMMARY")) {
    lifecycleState = "ACTIVITY_RECONCILED";
    nextAllowedAction = "SCORE_RESULTS";
  }
  return { lifecycleState, nextAllowedAction };
}

function validateEvidenceHashes(packet, issues) {
  const expected = collectSha256Values(packet);
  const declared = new Set(packet.evidenceHashes);
  for (const hash of expected) if (!declared.has(hash)) issues.push(issue("EVIDENCE_HASH_NOT_COVERED", "#/evidenceHashes"));
  for (const hash of declared) if (!expected.has(hash)) issues.push(issue("EVIDENCE_HASH_UNBOUND", "#/evidenceHashes"));
}

function validateClosedCompleteness(packet, issues) {
  if (packet.resolvedState !== "CLOSED") return;
  const requiredValues = [
    packet.repository.head, packet.repository.branch, packet.repository.clean, packet.protocol.logicalId,
    packet.protocol.registrationSha256, packet.protocol.activationReceiptSha256, packet.protocol.activePointerSha256,
    packet.sourceRights.scopeReceiptSha256, packet.sourceRights.sourceScopeSha256,
    packet.frame.readinessReceiptSha256, packet.frame.freezeReceiptSha256, packet.frame.manifestSha256,
    packet.frame.rowCount, packet.frame.eligibleCount, packet.frame.excludedCount,
    packet.sampleFreeze.freezeReceiptSha256, packet.sampleFreeze.sampleManifestSha256,
    packet.sampleFreeze.homologyManifestSha256, packet.sampleFreeze.sampleSize,
    packet.runner.registrationSha256, packet.runner.sourceCommit, packet.runner.sourceClosureSha256,
    packet.runner.closeoutReceiptSha256, packet.runner.independentReviewReceiptSha256,
    packet.reference.grantBinding, packet.reference.labelingReceiptSha256, packet.reference.sealReceiptSha256,
    packet.evaluated.grantBinding, packet.evaluated.executionRegistrationSha256,
    packet.evaluated.canaryReceiptSha256, packet.evaluated.runReceiptSha256,
    packet.materialCurrentness.currentnessReceiptSha256, packet.registeredInferenceFrame.inferenceFrameSha256,
    packet.activity.summaryReceiptSha256, packet.result.scoreReceiptSha256, packet.result.resultReceiptSha256,
    packet.result.metrics.metricsManifestSha256, packet.independentReview.final.receiptSha256,
    packet.independentReview.claimBoundary.receiptSha256, packet.aggregateExport.authorizationReceiptSha256,
    packet.aggregateExport.exportReceiptSha256, packet.aggregateExport.aggregateMetricsSha256,
  ];
  if (requiredValues.some((value) => value === null || value === false || value === undefined)) issues.push(issue("CLOSED_REQUIRED_FIELD_INCOMPLETE", "#"));
}

function determineEffectiveState(packet, lifecycle, currentness, activity, custody, providerAuthority, schemaIssues, issues) {
  if (lifecycle.lifecycleState === "UNREVIEWABLE") return "UNREVIEWABLE";
  if (!currentness.bindingsCurrent) return currentness.hasActivity ? "NEW_REGISTRATION_REQUIRED" : "MATERIAL_REFREEZE_REQUIRED";
  if (activity.unresolved) return "INTERRUPTED_RECONCILIATION_REQUIRED";
  if (packet.mode === "EXECUTE_OR_RESUME" && custody.required && !custody.complete) return "BLOCKED_CUSTODY";
  if (providerAuthority.anyExpiredOrStale || (packet.mode === "EXECUTE_OR_RESUME" && packet.authority.missing.length > 0)) return "BLOCKED_AUTHORITY";
  if (packet.mode === "EXECUTE_OR_RESUME" && !packet.repository.clean) return "BLOCKED_DIRTY_SOURCE";
  if (issues.some((entry) => entry.code === "GRAPH_REQUIRED_SIGNATURE_UNVERIFIED" || entry.code === "GRAPH_SIGNATURE_INVALID")) return "INVALID_HASH_OR_SIGNATURE";
  if (schemaIssues.length > 0 || issues.some((entry) => entry.severity === "invalid")) return "INVALID_HASH_OR_SIGNATURE";
  const issueCodes = new Set(issues.filter((entry) => entry.severity === "blocked").map((entry) => entry.code));
  if (issueCodes.has("ACTIVITY_UNKNOWN_DECLARATION_INVALID")) return "INTERRUPTED_RECONCILIATION_REQUIRED";
  if (issueCodes.has("PROTECTED_CUSTODY_INVALID") || issueCodes.has("CUSTODY_HANDOFF_REQUIRED")) return "BLOCKED_CUSTODY";
  if ([
    "AUTHORITY_PARTITION_INVALID", "AUTHORITY_PROOF_OUT_OF_SCOPE", "AUTHORITY_MISSING_OUT_OF_SCOPE",
    "EXECUTION_AUTHORITY_REQUIRED_EMPTY", "SOURCE_RIGHTS_AUTHORITY_PARTITION_MISMATCH", "AUTHORITY_EXPIRED",
    "PROVIDER_GRANT_STALE", "PROVIDER_GRANT_AUTHORITY_PARTITION_MISMATCH", "EXECUTION_PROVIDER_GRANT_MISSING",
    "EXECUTION_AUTHORITY_MISSING", "AGGREGATE_EXPORT_AUTHORITY_MISSING",
  ].some((code) => issueCodes.has(code))) return "BLOCKED_AUTHORITY";
  if (["REPOSITORY_IDENTITY_INCOMPLETE", "RUNNER_NOT_CURRENT", "EXECUTION_SOURCE_NOT_CLEAN_CURRENT"].some((code) => issueCodes.has(code))) return "BLOCKED_DIRTY_SOURCE";
  if (["ACTIVITY_CAP_EXCEEDED", "REFERENCE_NOT_SEALED"].some((code) => issueCodes.has(code))) return "BLOCKED_SEQUENCE";
  if (issueCodes.size > 0) return "BLOCKED_MISSING_EVIDENCE";
  if (lifecycle.lifecycleState === "CLOSED" && (packet.blockers.length > 0 || packet.checks.some((entry) => entry.status !== "pass"))) {
    if (packet.blockers.includes("CAP_EXCEEDED") || packet.blockers.includes("SEQUENCE_VIOLATION") || packet.blockers.includes("REFERENCE_NOT_SEALED")) return "BLOCKED_SEQUENCE";
    if (packet.blockers.some((code) => ["AUTHORITY_MISSING", "AUTHORITY_EXPIRED", "CAPS_MISSING", "EXPORT_NOT_AUTHORIZED"].includes(code))) return "BLOCKED_AUTHORITY";
    if (packet.blockers.includes("ROUTE_AUTHENTICITY_UNPROVEN")) return "BLOCKED_ROUTE_AUTHENTICITY";
    if (packet.blockers.includes("CUSTODY_HANDOFF_MISSING") || packet.blockers.includes("PROTECTED_CUSTODY_INVALID")) return "BLOCKED_CUSTODY";
    if (packet.blockers.includes("DIRTY_SOURCE") || packet.blockers.includes("RUNNER_NOT_CURRENT")) return "BLOCKED_DIRTY_SOURCE";
    if (packet.blockers.includes("UNKNOWN_ACTIVITY")) return "INTERRUPTED_RECONCILIATION_REQUIRED";
    if (packet.blockers.includes("HASH_MISMATCH") || packet.blockers.includes("SIGNATURE_INVALID")) return "INVALID_HASH_OR_SIGNATURE";
    return "BLOCKED_MISSING_EVIDENCE";
  }
  return lifecycle.lifecycleState;
}

function expectedNextAction(effectiveState, lifecycleAction) {
  switch (effectiveState) {
    case "NEW_REGISTRATION_REQUIRED": return "CREATE_NEW_REGISTRATION";
    case "MATERIAL_REFREEZE_REQUIRED": return "FREEZE_FRAME_AND_SAMPLE";
    case "INTERRUPTED_RECONCILIATION_REQUIRED": return "RECONCILE_ACTIVITY_OFFLINE";
    case "BLOCKED_CUSTODY": return "CREATE_CONTROLLED_CUSTODY_HANDOFF";
    case "BLOCKED_AUTHORITY": return "RENEW_PROVIDER_GRANT";
    case "BLOCKED_MISSING_EVIDENCE": return "SUPPLY_MISSING_EVIDENCE";
    case "BLOCKED_ROUTE_AUTHENTICITY": return "STOP_BLOCKED";
    case "BLOCKED_DIRTY_SOURCE": return "STOP_BLOCKED";
    case "BLOCKED_SEQUENCE": return "STOP_BLOCKED";
    case "INVALID_HASH_OR_SIGNATURE": return "STOP_BLOCKED";
    case "UNREVIEWABLE": return "STOP_BLOCKED";
    default: return lifecycleAction;
  }
}

function validateNaturalSemantics(packet, schemaIssues, nowMs) {
  const issues = [];
  validateAuthority(packet, issues, nowMs);
  const graph = validateGraphStructure(packet, issues, nowMs);
  validateReceiptMappings(packet, issues);
  validateTopLevelProjection(packet, issues);
  validateStageFieldCompleteness(packet, issues);
  const lifecycle = lifecycleFromGraph(packet, graph);
  validateFrameAndRunner(packet, issues, lifecycle.lifecycleState);
  const custody = validateCustody(packet, issues);
  const currentness = validateCurrentness(packet, issues);
  const providerAuthority = validateProviderAuthority(packet, issues, nowMs);
  const activity = validateActivity(packet, issues);
  validateReviews(packet, issues);
  validateResultAndExport(packet, issues);
  validateEvidenceHashes(packet, issues);
  validateClosedCompleteness(packet, issues);
  if (packet.evaluated.status !== "NOT_STARTED" && packet.reference.status !== "SEALED") issues.push(issue("REFERENCE_NOT_SEALED", "#/evaluated", "blocked"));

  const effectiveState = determineEffectiveState(packet, lifecycle, currentness, activity, custody, providerAuthority, schemaIssues, issues);
  const effectiveStateBlocksProgress = effectiveState.startsWith("BLOCKED_")
    || effectiveState === "INTERRUPTED_RECONCILIATION_REQUIRED";
  if (effectiveState === lifecycle.lifecycleState) {
    if (packet.resolvedState !== lifecycle.lifecycleState) issues.push(issue("RESOLVED_STATE_GRAPH_MISMATCH", "#/resolvedState"));
  } else if (packet.resolvedState !== effectiveState) {
    issues.push(issue("RESOLVED_STATE_EFFECTIVE_MISMATCH", "#/resolvedState", effectiveStateBlocksProgress ? "blocked" : "invalid"));
  }
  const nextAllowedAction = expectedNextAction(effectiveState, lifecycle.nextAllowedAction);
  if (packet.nextAllowedAction !== nextAllowedAction) issues.push(issue("NEXT_ACTION_MISMATCH", "#/nextAllowedAction", effectiveStateBlocksProgress ? "blocked" : "invalid"));
  if (packet.mode === "RECOVER" && packet.nextAllowedAction !== "RECONCILE_ACTIVITY_OFFLINE") issues.push(issue("RECOVER_OFFLINE_ACTION_REQUIRED", "#/nextAllowedAction"));
  return { issues, lifecycleState: lifecycle.lifecycleState, effectiveState, nextAllowedAction };
}

export async function loadNaturalEvidenceSchema() {
  if (!schemaCache) schemaCache = JSON.parse(await readFile(SCHEMA_PATH, "utf8"));
  return schemaCache;
}

export async function validateNaturalEvidence(packet, { nowMs = Date.now() } = {}) {
  const schema = await loadNaturalEvidenceSchema();
  const unsafeIssues = scanUnsafe(packet);
  const schemaIssues = [];
  validateSchemaNode(packet, schema, schema, "#", schemaIssues);
  let semantic;
  try {
    semantic = validateNaturalSemantics(packet, schemaIssues, nowMs);
  } catch {
    semantic = {
      issues: [issue("SEMANTIC_RESOLUTION_UNAVAILABLE", "#")],
      lifecycleState: "UNREGISTERED",
      effectiveState: "INVALID_HASH_OR_SIGNATURE",
      nextAllowedAction: "STOP_BLOCKED",
    };
  }
  const issues = [...unsafeIssues, ...schemaIssues, ...semantic.issues];
  const invalid = issues.some((entry) => entry.severity === "invalid");
  const blocked = !invalid && (
    issues.some((entry) => entry.severity === "blocked")
    || packet.blockers?.length > 0
    || packet.checks?.some((entry) => entry.status !== "pass")
    || BLOCKED_STATES.has(packet.resolvedState)
  );
  return {
    result: invalid ? "invalid" : blocked ? "blocked" : "valid",
    lifecycleState: semantic.lifecycleState,
    effectiveState: semantic.effectiveState,
    nextAllowedAction: semantic.nextAllowedAction,
    issues,
  };
}

export async function readPacketFile(file) {
  const bytes = await readFile(file);
  if (bytes.byteLength > MAX_INPUT_BYTES) {
    const error = new Error("INPUT_TOO_LARGE");
    error.code = "INPUT_TOO_LARGE";
    throw error;
  }
  try {
    return strictJsonParse(bytes);
  } catch (cause) {
    if (cause?.code === "JSON_DUPLICATE_KEY") throw cause;
    const error = new Error("JSON_MALFORMED");
    error.code = "JSON_MALFORMED";
    throw error;
  }
}

export function safeValidationOutput(result) {
  return {
    tool: "verify-evidence-envelope",
    contract: "EvidenceEnvelopeV1+NaturalSample-v1",
    offline: true,
    readOnly: true,
    redacted: true,
    contentAddressScope: "packet-local-internal-closure",
    issuerAuthenticity: "not-verified-by-offline-validator",
    providerAuthorityGranted: false,
    result: result.result,
    lifecycleState: result.lifecycleState,
    effectiveState: result.effectiveState,
    nextAllowedAction: result.nextAllowedAction,
    issues: result.issues.map(({ code, path: issuePath, severity }) => ({ code, path: safeIssuePath(issuePath), severity })),
  };
}

function help() {
  return "Usage: node scripts/verify-evidence-envelope.mjs PACKET.json\n\nOffline, read-only, redacted validation of EvidenceEnvelopeV1 plus the registered MAIS natural-sample contract. The script never contacts a provider, reads credentials, reads protected question content, grants provider authority, or cryptographically authenticates an issuer. Packet-local content addresses prove only internal closure; VERIFIED external evidence is a structurally checked declaration whose trust anchor must be verified by the native authority boundary.\n\nExit codes: 0 valid; 2 blocked/invalid input; 3 tool failure.";
}

async function main(argv) {
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(`${help()}\n`);
    return 0;
  }
  if (argv.length !== 1 || argv[0].startsWith("-")) {
    process.stdout.write(`${JSON.stringify({ tool: "verify-evidence-envelope", result: "invalid", offline: true, readOnly: true, redacted: true, issues: [{ code: "ARGUMENT_INVALID", path: "#", severity: "invalid" }] })}\n`);
    return 2;
  }
  try {
    const packet = await readPacketFile(argv[0]);
    const result = await validateNaturalEvidence(packet);
    process.stdout.write(`${JSON.stringify(safeValidationOutput(result))}\n`);
    return result.result === "valid" ? 0 : 2;
  } catch (error) {
    const code = ["JSON_MALFORMED", "JSON_DUPLICATE_KEY", "INPUT_TOO_LARGE"].includes(error?.code) ? error.code : "INPUT_READ_FAILED";
    const status = code === "INPUT_READ_FAILED" ? 3 : 2;
    process.stdout.write(`${JSON.stringify({ tool: "verify-evidence-envelope", result: status === 3 ? "error" : "invalid", offline: true, readOnly: true, redacted: true, issues: [{ code, path: "#", severity: "invalid" }] })}\n`);
    return status;
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  process.exitCode = await main(process.argv.slice(2));
}
