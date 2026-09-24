import { createHash } from "node:crypto";
import { lstatSync, readFile, readFileSync, realpathSync, stat } from "node:fs";
import { builtinModules } from "node:module";
import { dirname, extname, isAbsolute, relative, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";

const SCHEMA = JSON.parse(
  readFileSync(new URL("../assets/machine-qa-evidence.schema.json", import.meta.url), "utf8"),
);

export const HASH_RE = /^[a-f0-9]{64}$/;
export const EMPTY_SHA256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
export const COMMIT_RE = /^[a-f0-9]{40}$/;
export const CANDIDATE_ID_RE = /^candidate-[a-f0-9]{16}$/;
export const EVIDENCE_ID_RE = /^evidence-[a-f0-9]{16}$/;
export const AUTHORIZATION_ID_RE = /^authorization-[a-f0-9]{16}$/;
export const RUNNER_LOGICAL_ID_RE = /^runner-[a-z0-9]{1,16}-[a-f0-9]{16}$/;
export const VERSION_RE = /^(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)(?:-[a-z0-9]+(?:\.[a-z0-9]+)*)?$/;
export const PROTOCOL_ID_RE = /^protocol-[a-z0-9]{1,16}-[a-f0-9]{16}$/;
export const SOURCE_LOGICAL_ID_RE = /^source-[a-z0-9]{1,16}-[a-f0-9]{16}$/;
export const PROVIDER_ID_RE = /^provider-[a-z0-9]{1,16}-[a-f0-9]{16}$/;
export const MODEL_ID_RE = /^model-[a-z0-9]{1,16}-[a-f0-9]{16}$/;
export const CODE_RE = /^[A-Z][A-Z0-9_]{2,63}$/;
export const EVIDENCE_REF_RE = /^(?:sha256:[a-f0-9]{64}|ref:[A-Z][A-Z0-9_]{2,63})$/;
export const REPOSITORY_BRANCH_RE = /^(?:main|master|(?:codex|feat|fix|chore|docs|release)\/[a-z0-9]{1,24}-[a-f0-9]{8,16})$/;
export const RUNNER_PATH_RE = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?:[A-Za-z0-9._-]+\/)+[A-Za-z0-9._-]+\.(?:mjs|cjs|js|ts)$/;
export const EXECUTABLE_PATH_RE = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/;
export const DISPOSITIONS = new Set(["candidate-only", "needs-repair", "blocked"]);
export const EVIDENCE_CLASSES = new Set([
  "synthetic-calibration",
  "exact-package-machine-review",
]);
export const STATUS_VALUES = new Set(["complete", "blocked", "invalid"]);
export const NEXT_ALLOWED_ACTIONS = new Set([
  "handoff-to-a18",
  "repair-candidate",
  "record-calibration-result",
  "revise-machine-qa-policy",
  "supply-missing-evidence",
  "renew-exact-authorization",
  "revalidate-packet",
  "stop-blocked",
]);
export const C0_ROLES = [
  "answer-blind-solver",
  "tool-verifier",
  "adversarial-grader",
  "bilingual-curriculum-critic",
  "evidence-verifier",
];
export const LIVE_ROLES = new Set(["b-prime-reviewer", ...C0_ROLES]);
export const PROOF_BOUNDARIES = [
  "localTest",
  "receipt",
  "trackedCommitted",
  "main",
  "ci",
  "deployment",
  "live",
];
export const OFFLINE_AUTHORITY_CODE = "OFFLINE_AUDIT_AUTHORITY";
export const LIVE_AUTHORITY_CODE = "LIVE_AUTHORIZATION_RECEIPT";
export const AUTHORITY_CODES = new Set([OFFLINE_AUTHORITY_CODE, LIVE_AUTHORITY_CODE]);
export const BLOCKER_CODES = new Set([
  "AUTHORITY_MISSING",
  "CHECK_NOT_PASSED",
  "C0_REVIEW_REQUIRED",
  "MACHINE_DISPOSITION_BLOCKED",
  "PACKET_NOT_COMPLETE",
  "RECEIPT_PROOF_NOT_PASSED",
  "UNRESOLVED_BLOCKERS",
  "VALIDATION_FAILED",
]);
export const CHECK_CODES = new Set(["IDENTITY_BOUND", "REVIEW_COMPLETE"]);
export const DEVIATION_CODES = new Set(["DECLARED_DEVIATION", "STREAM_MODE_DEVIATION"]);
export const C0_TRIGGER_CODES = new Set([
  "P0_ANSWER_RISK",
  "P1_ANSWER_RISK",
  "P0_MATH_RISK",
  "P1_MATH_RISK",
  "P0_COVERAGE_RISK",
  "P1_COVERAGE_RISK",
  "P0_SCHEMA_RISK",
  "P1_SCHEMA_RISK",
  "SOURCE_RISK",
  "LICENSING_RISK",
  "AGE_RISK",
  "GRADE_RISK",
  "CURRICULUM_RISK",
  "LANGUAGE_RISK",
  "REGION_RISK",
  "ANSWER_CRITICAL_VISUAL_RISK",
  "EVIDENCE_RISK",
  "DETERMINISTIC_B_PRIME_CONFLICT",
  "CRITIQUE_REVISION_CONFLICT",
  "INVALID_TAXONOMY_RISK",
  "INVALID_ROLE_RISK",
  "INVALID_PROJECTION_RISK",
  "INCOMPLETE_INSPECTION_COVERAGE",
  "OUT_OF_DISTRIBUTION_RISK",
  "STRATIFIED_RANDOM_AUDIT",
]);
export const RECEIPT_BINDING_VERSION = "1.0.0";
export const ACTIVE_MANIFEST_VERSION = "1.0.0";
export const ACTIVE_VALIDATION_RECEIPT_DOMAIN =
  "mais-rsi-active-validation-receipt-v1";
export const D_PRIME_VALIDATION_RECEIPT_DOMAIN =
  "mais-rsi-d-prime-validation-receipt-v1";
export const D_PRIME_INVALIDATED_SET_DOMAIN =
  "mais-rsi-d-prime-invalidated-set-v1";
export const D_PRIME_CURRENT_SET_DOMAIN =
  "mais-rsi-d-prime-current-set-v1";
export const EXECUTABLE_CODE_MANIFEST_DOMAIN =
  "mais-rsi-executable-code-manifest-v1";

const BASE_RECEIPT_SLOTS = [
  "deterministic",
  "b-prime-critique",
  "b-prime-revision",
];
const INDEPENDENT_RECEIPT_SLOT = "independent-review";

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isObject(value)) return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]),
  );
}

export function canonicalSha256(value) {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(value)), "utf8")
    .digest("hex");
}

export function computeBoundReceiptSha256(slot, artifactSha256, controlPlaneSha256) {
  return canonicalSha256({
    bindingVersion: RECEIPT_BINDING_VERSION,
    slot,
    artifactSha256,
    controlPlaneSha256,
  });
}

export function computeReceiptArtifactSha256(slot, resultSha256, controlPlaneSha256) {
  return canonicalSha256({
    receiptVersion: RECEIPT_BINDING_VERSION,
    slot,
    resultSha256,
    controlPlaneSha256,
  });
}

export function computeActiveReceiptManifestSha256(manifest) {
  if (!isObject(manifest)) return null;
  const projection = Object.fromEntries(
    Object.entries(manifest).filter(([key]) => key !== "manifestSha256"),
  );
  return canonicalSha256(projection);
}

export function expectedValidationRoleForSlot(slot) {
  if (slot === "deterministic") return "deterministic-validator";
  if (slot === "b-prime-critique" || slot === "b-prime-revision") {
    return "b-prime-reviewer";
  }
  if (slot === INDEPENDENT_RECEIPT_SLOT) return "independent-machine-reviewer";
  if (typeof slot === "string" && slot.startsWith("c0-")) {
    const role = slot.slice(3);
    if (C0_ROLES.includes(role)) return role;
  }
  return null;
}

export function computeValidationReceiptSha256(body) {
  return canonicalSha256({
    domain: ACTIVE_VALIDATION_RECEIPT_DOMAIN,
    body,
  });
}

export function computeReceiptSetSha256(domain, hashes) {
  return canonicalSha256({
    domain,
    hashes: [...hashes].sort(),
  });
}

export function computeDPrimeValidationReceiptSha256(body) {
  return canonicalSha256({
    domain: D_PRIME_VALIDATION_RECEIPT_DOMAIN,
    body,
  });
}

export function computeExecutableCodeManifestSha256(body) {
  return canonicalSha256({
    domain: EXECUTABLE_CODE_MANIFEST_DOMAIN,
    body,
  });
}

export function computeAuthorizationSha256(projection) {
  return canonicalSha256(projection);
}

export function computeResultSha256(resultBody) {
  return canonicalSha256(resultBody);
}

export function computeTrustReceiptIdentitySha256(anchor) {
  if (!isObject(anchor)) return null;
  const projection = Object.fromEntries(
    Object.entries(anchor).filter(([key]) => key !== "receiptIdentitySha256"),
  );
  return canonicalSha256(projection);
}

const SUSPICIOUS_KEYS = new Set([
  "apikey",
  "apikeyvalue",
  "accesstoken",
  "refreshtoken",
  "token",
  "tokens",
  "password",
  "clientsecret",
  "privatekey",
  "secret",
  "secrets",
  "secretvalue",
  "credential",
  "credentials",
  "credentialvalue",
  "bearer",
  "rawproviderresponse",
  "rawproviderresponses",
  "providerresponsebody",
  "rawprompt",
  "systemprompt",
  "rawquestion",
  "rawquestions",
  "rawquestiontext",
  "rawtext",
  "question",
  "questiontext",
  "candidatetext",
  "candidatecontent",
  "rawcandidate",
  "rawcontent",
  "gold",
  "goldanswer",
  "goldrow",
  "goldrows",
  "goldledger",
  "acceptedanswer",
  "acceptedanswerbody",
  "answerkey",
  "concealedarm",
  "concealedseed",
  "providerreasoning",
  "reasoning",
  "chainofthought",
  "cot",
  "upstreambody",
  "authorizationtext",
  "exactauthorization",
  "oauthtoken",
  "authtoken",
  "tokenvalue",
  "clientsecretvalue",
  "privatekeypem",
  "researchrows",
  "studentidentifier",
  "personalidentifier",
  "rawresearchrow",
]);
const FORBIDDEN_NORMALIZED_VALUES = [
  "approvedforintegrationreview",
  "integrationreviewapproved",
  "approvedforproduction",
  "productionapproved",
  "productionready",
  "readyforproduction",
  "contentapproved",
  "contentapprovalgranted",
  "promotionapproved",
  "releaseapproved",
  "releaseready",
  "liveapproved",
  "shipready",
];
const CLAIM_BEARING_CODE_RE = /(?:approval|approved|readiness|ready)/;
const PROTECTED_VALUE_MARKERS = [
  "rawquestion",
  "rawquestiontext",
  "candidatetext",
  "candidatecontent",
  "rawproviderresponse",
  "providerreasoning",
  "chainofthought",
  "upstreambody",
  "goldledger",
  "apikey",
  "accesstoken",
  "refreshtoken",
  "privatekey",
  "password",
  "clientsecret",
  "secretvalue",
  "oauthtoken",
  "authtoken",
  "tokenvalue",
];
const APPROVAL_BOOLEAN_KEYS = new Set([
  "approved",
  "productionapproved",
  "contentapproved",
  "promotionapproved",
  "releaseapproved",
  "liveapproved",
  "contentapprovalgranted",
  "promotiongranted",
  "releasegranted",
  "liveproofgranted",
]);
const SECRET_CONTAINER_PATTERNS = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bBearer\s+[A-Za-z0-9._~-]{8,}/i,
];

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function resolveMachineQaTransition(input) {
  const evidenceClass = input?.evidenceClass;
  const status = input?.status;
  const machineDisposition = input?.machineDisposition;
  const nextAllowedAction = input?.nextAllowedAction;
  const receiptProofStatus = input?.receiptProofStatus;
  const independentReviewStatus = input?.independentReviewStatus;
  let valid = EVIDENCE_CLASSES.has(evidenceClass) &&
    STATUS_VALUES.has(status) &&
    DISPOSITIONS.has(machineDisposition) &&
    NEXT_ALLOWED_ACTIONS.has(nextAllowedAction);
  let expectedActions = [];

  if (status === "complete") {
    const completeTransitions = evidenceClass === "exact-package-machine-review"
      ? {
          "candidate-only": "handoff-to-a18",
          "needs-repair": "repair-candidate",
        }
      : evidenceClass === "synthetic-calibration"
        ? {
            "candidate-only": "record-calibration-result",
            "needs-repair": "revise-machine-qa-policy",
          }
        : {};
    const expected = completeTransitions[machineDisposition];
    expectedActions = expected === undefined ? [] : [expected];
    valid = valid &&
      expected !== undefined &&
      nextAllowedAction === expected &&
      receiptProofStatus === "passed" &&
      independentReviewStatus === "passed";
  } else if (status === "blocked") {
    expectedActions = [
      "renew-exact-authorization",
      "stop-blocked",
      "supply-missing-evidence",
    ];
    valid = valid &&
      machineDisposition === "blocked" &&
      receiptProofStatus !== "passed" &&
      independentReviewStatus !== "passed" &&
      expectedActions.includes(nextAllowedAction);
  } else if (status === "invalid") {
    expectedActions = ["revalidate-packet", "stop-blocked"];
    valid = valid &&
      machineDisposition === "blocked" &&
      receiptProofStatus !== "passed" &&
      independentReviewStatus !== "passed" &&
      expectedActions.includes(nextAllowedAction);
  } else {
    valid = false;
  }

  return {
    valid,
    expectedActions,
    result: valid && status === "complete" ? "valid" : "blocked",
    exitCode: valid && status === "complete" ? 0 : 2,
  };
}

function normalize(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function deepEqual(a, b) {
  return JSON.stringify(canonicalize(a)) === JSON.stringify(canonicalize(b));
}

function isIsoTimestamp(value) {
  if (typeof value !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) && new Date(milliseconds).toISOString() === value;
}

function resolveRef(reference) {
  if (!reference.startsWith("#/$defs/")) throw new Error("unsupported local schema reference");
  const name = reference.slice("#/$defs/".length);
  const resolved = SCHEMA.$defs[name];
  if (!resolved) throw new Error("missing local schema reference");
  return resolved;
}

function addIssue(issues, code, path) {
  issues.push({ code, path });
}

function validateSchemaNode(value, schema, path, issues) {
  if (schema.$ref) return validateSchemaNode(value, resolveRef(schema.$ref), path, issues);

  if (schema.oneOf) {
    const branchResults = schema.oneOf.map((candidate) => {
      const branchIssues = [];
      validateSchemaNode(value, candidate, path, branchIssues);
      return branchIssues;
    });
    const matches = branchResults.filter((branchIssues) => branchIssues.length === 0).length;
    if (matches !== 1) {
      addIssue(issues, "SCHEMA_ONE_OF_MISMATCH", path);
      if (matches === 0) {
        const closest = [...branchResults].sort((a, b) => a.length - b.length)[0] ?? [];
        issues.push(...closest);
      }
    }
    return;
  }
  if (schema.allOf) {
    for (const candidate of schema.allOf) validateSchemaNode(value, candidate, path, issues);
  }
  if (schema.if) {
    const branch = schemaMatches(value, schema.if) ? schema.then : schema.else;
    if (branch) validateSchemaNode(value, branch, path, issues);
  }
  if (schema.not && schemaMatches(value, schema.not)) {
    addIssue(issues, "SCHEMA_NOT_VIOLATION", path);
  }
  if (Object.hasOwn(schema, "const") && !deepEqual(value, schema.const)) {
    addIssue(issues, "SCHEMA_CONST_MISMATCH", path);
  }
  if (schema.enum && !schema.enum.some((candidate) => deepEqual(value, candidate))) {
    addIssue(issues, "SCHEMA_ENUM_MISMATCH", path);
  }

  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const validType = types.some((type) =>
      (type === "object" && isObject(value)) ||
      (type === "array" && Array.isArray(value)) ||
      (type === "string" && typeof value === "string") ||
      (type === "boolean" && typeof value === "boolean") ||
      (type === "null" && value === null) ||
      (type === "integer" && Number.isInteger(value)) ||
      (type === "number" && typeof value === "number" && Number.isFinite(value)),
    );
    if (!validType) {
      addIssue(issues, "SCHEMA_TYPE_MISMATCH", path);
      return;
    }
  }

  if (isObject(value)) {
    if (schema.required) {
      for (const key of schema.required) {
        if (!Object.hasOwn(value, key)) addIssue(issues, "SCHEMA_REQUIRED_MISSING", `${path}.${key}`);
      }
    }
    if (schema.additionalProperties === false && schema.properties) {
      const allowed = new Set(Object.keys(schema.properties));
      if (Object.keys(value).some((key) => !allowed.has(key))) {
        addIssue(issues, "SCHEMA_UNKNOWN_PROPERTY", path);
      }
    }
    if (schema.properties) {
      for (const [key, childSchema] of Object.entries(schema.properties)) {
        if (Object.hasOwn(value, key)) validateSchemaNode(value[key], childSchema, `${path}.${key}`, issues);
      }
    }
    if (schema.minProperties !== undefined && Object.keys(value).length < schema.minProperties) {
      addIssue(issues, "SCHEMA_MIN_PROPERTIES", path);
    }
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      addIssue(issues, "SCHEMA_MIN_ITEMS", path);
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      addIssue(issues, "SCHEMA_MAX_ITEMS", path);
    }
    if (schema.uniqueItems) {
      const serialized = value.map((item) => JSON.stringify(item));
      if (new Set(serialized).size !== serialized.length) addIssue(issues, "SCHEMA_ITEMS_NOT_UNIQUE", path);
    }
    if (schema.items) {
      value.forEach((item, index) => validateSchemaNode(item, schema.items, `${path}[${index}]`, issues));
    }
  }

  if (typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      addIssue(issues, "SCHEMA_STRING_TOO_SHORT", path);
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      addIssue(issues, "SCHEMA_STRING_TOO_LONG", path);
    }
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      addIssue(issues, "SCHEMA_PATTERN_MISMATCH", path);
    }
    if (schema.format === "date-time" && !isIsoTimestamp(value)) {
      addIssue(issues, "SCHEMA_TIMESTAMP_INVALID", path);
    }
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    if (schema.minimum !== undefined && value < schema.minimum) addIssue(issues, "SCHEMA_MINIMUM", path);
    if (schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) {
      addIssue(issues, "SCHEMA_EXCLUSIVE_MINIMUM", path);
    }
  }
}

function schemaMatches(value, schema) {
  const issues = [];
  validateSchemaNode(value, schema, "$", issues);
  return issues.length === 0;
}

function scanUnsafe(value, state) {
  if (Array.isArray(value)) {
    for (const item of value) scanUnsafe(item, state);
    return;
  }
  if (isObject(value)) {
    for (const [key, child] of Object.entries(value)) {
      const keyName = normalize(key);
      if (SUSPICIOUS_KEYS.has(keyName)) {
        state.protectedFieldCount += 1;
        state.codes.add("UNSAFE_FIELD_PRESENT");
        continue;
      }
      if (child === true && APPROVAL_BOOLEAN_KEYS.has(keyName)) {
        state.codes.add("FORBIDDEN_APPROVAL_CLAIM");
      }
      scanUnsafe(child, state);
    }
    return;
  }
  if (typeof value !== "string") return;
  const compact = normalize(value);
  const referencedCode = value.startsWith("ref:") ? value.slice(4) : value;
  if (
    FORBIDDEN_NORMALIZED_VALUES.some((marker) => compact.includes(marker)) ||
    (CODE_RE.test(referencedCode) && CLAIM_BEARING_CODE_RE.test(normalize(referencedCode)))
  ) {
    state.codes.add("FORBIDDEN_APPROVAL_CLAIM");
  }
  if (PROTECTED_VALUE_MARKERS.some((marker) => compact.includes(marker))) {
    state.codes.add("PROTECTED_CONTENT_MARKER");
  }
  if (SECRET_CONTAINER_PATTERNS.some((pattern) => pattern.test(value))) {
    state.codes.add("SUSPICIOUS_SECRET_VALUE");
  }
}

export function inspectUnsafeContent(value) {
  const state = { codes: new Set(), protectedFieldCount: 0 };
  scanUnsafe(value, state);
  return { codes: [...state.codes].sort(), protectedFieldCount: state.protectedFieldCount };
}

function pushUnsafeIssues(packet, issues) {
  const unsafe = inspectUnsafeContent(packet);
  for (const code of unsafe.codes) addIssue(issues, code, "$[redacted]");
}

function validateNoEmptySha256(value, issues) {
  if (Array.isArray(value)) {
    value.forEach((item) => validateNoEmptySha256(item, issues));
    return;
  }
  if (isObject(value)) {
    for (const child of Object.values(value)) validateNoEmptySha256(child, issues);
    return;
  }
  if (value === EMPTY_SHA256 || value === `sha256:${EMPTY_SHA256}`) {
    addIssue(issues, "EMPTY_SHA256_FORBIDDEN", "$[redacted]");
  }
}

function compareBinding(issues, actual, expected, path, code = "IDENTITY_BINDING_MISMATCH") {
  if (typeof actual === "string" && typeof expected === "string" && actual !== expected) {
    addIssue(issues, code, path);
  }
}

function validateTrustAnchor(packet, anchor, expectedKind, expectedBoundHash, issues, path, nowMs) {
  if (!isObject(anchor)) return;
  if (anchor.receiptKind !== expectedKind || anchor.status !== "VERIFIED") {
    addIssue(issues, "TRUST_ANCHOR_STATUS_OR_KIND_INVALID", path);
  }
  compareBinding(
    issues,
    anchor.boundReceiptSha256,
    expectedBoundHash,
    `${path}.boundReceiptSha256`,
    "TRUST_ANCHOR_BOUND_RECEIPT_MISMATCH",
  );
  const expectedIdentity = computeTrustReceiptIdentitySha256(anchor);
  compareBinding(
    issues,
    anchor.receiptIdentitySha256,
    expectedIdentity,
    `${path}.receiptIdentitySha256`,
    "TRUST_ANCHOR_RECEIPT_IDENTITY_MISMATCH",
  );
  const sourceBound = Array.isArray(packet.sourceIdentity) && packet.sourceIdentity.some(
    (source) => source?.sha256 === anchor.sourceIdentitySha256,
  );
  if (!sourceBound) {
    addIssue(issues, "TRUST_ANCHOR_SOURCE_IDENTITY_UNBOUND", `${path}.sourceIdentitySha256`);
  }
  const verified = Date.parse(anchor.verifiedAt);
  const observed = Date.parse(packet.observedAt);
  const checked = Date.parse(packet.currentness?.checkedAt);
  if (
    ![verified, observed, checked].every(Number.isFinite) ||
    !(verified <= observed && observed <= checked && checked <= nowMs)
  ) {
    addIssue(issues, "TRUST_ANCHOR_TEMPORAL_ORDER_INVALID", `${path}.verifiedAt`);
  }
}

function validateCompleteState(packet, issues) {
  const transition = resolveMachineQaTransition({
    evidenceClass: packet.evidenceClass,
    status: packet.status,
    machineDisposition: packet.machineDisposition,
    nextAllowedAction: packet.nextAllowedAction,
    receiptProofStatus: packet.proofBoundaries?.receipt?.status,
    independentReviewStatus: packet.independentReviewState?.status,
  });
  if (!transition.valid) {
    addIssue(issues, "STATE_TRANSITION_INVALID", "$");
  }
  if (packet.status !== "complete") {
    addIssue(issues, "PACKET_NOT_COMPLETE", "$.status");
    return;
  }
  if (packet.resolvedState !== "machine-evidence-complete") {
    addIssue(issues, "RESOLVED_STATE_STATUS_MISMATCH", "$.resolvedState");
  }
  if (packet.machineDisposition === "blocked") {
    addIssue(issues, "MACHINE_DISPOSITION_BLOCKED", "$.machineDisposition");
  }
  if (Array.isArray(packet.blockers) && packet.blockers.length > 0) {
    addIssue(issues, "UNRESOLVED_BLOCKERS", "$.blockers");
  }
  if (Array.isArray(packet.checks) && packet.checks.some((check) => check?.status !== "pass")) {
    addIssue(issues, "CHECK_NOT_PASSED", "$.checks");
  }
}

function validateAuthority(packet, issues, nowMs) {
  const authority = packet.authority;
  if (!isObject(authority)) return;
  if (Array.isArray(authority.missing) && authority.missing.length > 0) {
    addIssue(issues, "AUTHORITY_MISSING", "$.authority.missing");
  }
  if (Array.isArray(authority.required) && Array.isArray(authority.proven)) {
    if (authority.required.some((item) => !authority.proven.includes(item))) {
      addIssue(issues, "AUTHORITY_REQUIREMENT_NOT_PROVEN", "$.authority.proven");
    }
  }
  const live = packet.authorization?.liveProviderUsed === true;
  const expected = live ? [LIVE_AUTHORITY_CODE] : [OFFLINE_AUTHORITY_CODE];
  for (const partition of ["required", "proven"]) {
    if (!deepEqual(authority[partition], expected)) {
      addIssue(issues, "AUTHORITY_RECEIPT_REFERENCE_MISMATCH", `$.authority.${partition}`);
    }
  }
  if (!deepEqual(authority.missing, [])) {
    addIssue(issues, "AUTHORITY_MISSING", "$.authority.missing");
  }
  if (!live && authority.expiresAt !== undefined) {
    addIssue(issues, "OFFLINE_AUTHORITY_EXPIRY_UNSUPPORTED", "$.authority.expiresAt");
  }
  if (authority.expiresAt !== undefined) {
    const observed = Date.parse(packet.observedAt);
    const checked = Date.parse(packet.currentness?.checkedAt);
    const expires = Date.parse(authority.expiresAt);
    if (
      ![observed, checked, expires].every(Number.isFinite) ||
      !(observed <= checked && checked <= nowMs && nowMs < expires)
    ) {
      addIssue(issues, "AUTHORITY_TEMPORAL_ORDER_INVALID", "$.authority.expiresAt");
    }
    if (Number.isFinite(expires) && nowMs >= expires) {
      addIssue(issues, "AUTHORITY_EXPIRED", "$.authority.expiresAt");
    }
  }
}

function validateRepositoryIdentity(packet, issues) {
  if (packet.status !== "complete" || !isObject(packet.repository)) return;
  if (!COMMIT_RE.test(packet.repository.head ?? "")) {
    addIssue(issues, "REPOSITORY_HEAD_UNRESOLVED", "$.repository.head");
  }
  if (
    typeof packet.repository.branch !== "string" ||
    !REPOSITORY_BRANCH_RE.test(packet.repository.branch)
  ) {
    addIssue(issues, "REPOSITORY_BRANCH_UNRESOLVED", "$.repository.branch");
  }
  if (typeof packet.repository.clean !== "boolean") {
    addIssue(issues, "REPOSITORY_CLEAN_STATE_UNRESOLVED", "$.repository.clean");
  }
}

function addGrammarIssue(issues, value, pattern, path) {
  if (typeof value !== "string" || !pattern.test(value)) {
    addIssue(issues, "STRING_GRAMMAR_INVALID", path);
  }
}

function validateRegisteredCode(issues, value, registry, path) {
  addGrammarIssue(issues, value, CODE_RE, path);
  if (typeof value === "string" && !registry.has(value)) {
    addIssue(issues, "CODE_REGISTRY_INVALID", path);
  }
}

function validateStringGrammars(packet, issues) {
  addGrammarIssue(issues, packet.evidenceId, EVIDENCE_ID_RE, "$.evidenceId");
  if (isObject(packet.repository) && packet.repository.branch !== null) {
    addGrammarIssue(issues, packet.repository.branch, REPOSITORY_BRANCH_RE, "$.repository.branch");
  }
  if (Array.isArray(packet.sourceIdentity)) {
    for (const source of packet.sourceIdentity) {
      addGrammarIssue(issues, source?.logicalId, SOURCE_LOGICAL_ID_RE, "$.sourceIdentity.logicalId");
    }
  }
  if (isObject(packet.authority)) {
    for (const partition of ["required", "proven", "missing"]) {
      if (Array.isArray(packet.authority[partition])) {
        for (const value of packet.authority[partition]) {
          validateRegisteredCode(issues, value, AUTHORITY_CODES, `$.authority.${partition}`);
        }
      }
    }
  }
  if (Array.isArray(packet.blockers)) {
    for (const value of packet.blockers) {
      validateRegisteredCode(issues, value, BLOCKER_CODES, "$.blockers");
    }
  }
  if (Array.isArray(packet.checks)) {
    for (const check of packet.checks) {
      validateRegisteredCode(issues, check?.id, CHECK_CODES, "$.checks.id");
      if (check?.evidenceRef !== undefined) {
        addGrammarIssue(issues, check.evidenceRef, EVIDENCE_REF_RE, "$.checks.evidenceRef");
        if (
          typeof check.evidenceRef === "string" &&
          check.evidenceRef.startsWith("ref:") &&
          !CHECK_CODES.has(check.evidenceRef.slice(4))
        ) {
          addIssue(issues, "CODE_REGISTRY_INVALID", "$.checks.evidenceRef");
        }
      }
    }
  }
  if (Array.isArray(packet.deviations)) {
    for (const deviation of packet.deviations) {
      validateRegisteredCode(issues, deviation?.code, DEVIATION_CODES, "$.deviations.code");
    }
  }
  const identity = packet.identity;
  if (isObject(identity)) {
    addGrammarIssue(issues, identity.candidateId, CANDIDATE_ID_RE, "$.identity.candidateId");
    for (const field of [
      "candidateVersion",
      "policyVersion",
      "protocolVersion",
      "taxonomyVersion",
      "evidenceSchemaVersion",
    ]) {
      addGrammarIssue(issues, identity[field], VERSION_RE, `$.identity.${field}`);
    }
    addGrammarIssue(issues, identity.protocolId, PROTOCOL_ID_RE, "$.identity.protocolId");
  }
  const authorization = packet.authorization;
  if (authorization?.liveProviderUsed === true) {
    addGrammarIssue(
      issues,
      authorization.authorizationId,
      AUTHORIZATION_ID_RE,
      "$.authorization.authorizationId",
    );
    addGrammarIssue(issues, authorization.policyVersion, VERSION_RE, "$.authorization.policyVersion");
    addGrammarIssue(issues, authorization.protocolId, PROTOCOL_ID_RE, "$.authorization.protocolId");
    addGrammarIssue(issues, authorization.protocolVersion, VERSION_RE, "$.authorization.protocolVersion");
    addGrammarIssue(issues, authorization.provider, PROVIDER_ID_RE, "$.authorization.provider");
    addGrammarIssue(issues, authorization.model, MODEL_ID_RE, "$.authorization.model");
    addGrammarIssue(
      issues,
      authorization.runnerLogicalId,
      RUNNER_LOGICAL_ID_RE,
      "$.authorization.runnerLogicalId",
    );
    const projection = authorization.authorizationProjection;
    if (isObject(projection)) {
      addGrammarIssue(issues, projection.authorizationId, AUTHORIZATION_ID_RE, "$.authorization.authorizationProjection.authorizationId");
      addGrammarIssue(issues, projection.policyVersion, VERSION_RE, "$.authorization.authorizationProjection.policyVersion");
      addGrammarIssue(issues, projection.protocolId, PROTOCOL_ID_RE, "$.authorization.authorizationProjection.protocolId");
      addGrammarIssue(issues, projection.protocolVersion, VERSION_RE, "$.authorization.authorizationProjection.protocolVersion");
      addGrammarIssue(issues, projection.candidateId, CANDIDATE_ID_RE, "$.authorization.authorizationProjection.candidateId");
      addGrammarIssue(issues, projection.candidateVersion, VERSION_RE, "$.authorization.authorizationProjection.candidateVersion");
      addGrammarIssue(issues, projection.taxonomyVersion, VERSION_RE, "$.authorization.authorizationProjection.taxonomyVersion");
      addGrammarIssue(issues, projection.evidenceSchemaVersion, VERSION_RE, "$.authorization.authorizationProjection.evidenceSchemaVersion");
      addGrammarIssue(issues, projection.provider, PROVIDER_ID_RE, "$.authorization.authorizationProjection.provider");
      addGrammarIssue(issues, projection.model, MODEL_ID_RE, "$.authorization.authorizationProjection.model");
      addGrammarIssue(issues, projection.runnerLogicalId, RUNNER_LOGICAL_ID_RE, "$.authorization.authorizationProjection.runnerLogicalId");
    }
  }
  if (isObject(packet.liveExecution)) {
    addGrammarIssue(
      issues,
      packet.liveExecution.runnerLogicalId,
      RUNNER_LOGICAL_ID_RE,
      "$.liveExecution.runnerLogicalId",
    );
  }
  if (packet.c0Prime?.required === true && Array.isArray(packet.c0Prime.triggers)) {
    for (const trigger of packet.c0Prime.triggers) {
      validateRegisteredCode(issues, trigger, C0_TRIGGER_CODES, "$.c0Prime.triggers");
    }
  }
  if (packet.remediation?.candidateMutated === true) {
    for (const [name, candidate] of [
      ["priorCandidate", packet.remediation.priorCandidate],
      ["newCandidate", packet.remediation.newCandidate],
    ]) {
      addGrammarIssue(issues, candidate?.id, CANDIDATE_ID_RE, `$.remediation.${name}.id`);
      addGrammarIssue(issues, candidate?.version, VERSION_RE, `$.remediation.${name}.version`);
    }
  }
}

function c0Slot(role) {
  return `c0-${role}`;
}

function manifestBindingEntries(manifest) {
  if (!isObject(manifest?.bindings)) return [];
  const entries = [
    ["deterministic", manifest.bindings.deterministic],
    ["b-prime-critique", manifest.bindings.bPrimeCritique],
    ["b-prime-revision", manifest.bindings.bPrimeRevision],
  ];
  if (manifest.c0Required === true && isObject(manifest.bindings.c0Roles)) {
    for (const role of C0_ROLES) entries.push([c0Slot(role), manifest.bindings.c0Roles[role]]);
  }
  entries.push([INDEPENDENT_RECEIPT_SLOT, manifest.bindings.independentReview]);
  return entries;
}

function manifestActiveHashes(manifest) {
  return manifestBindingEntries(manifest)
    .flatMap(([, binding]) => [
      binding?.resultBody?.outputDigestSha256,
      binding?.resultBody?.validationProjection?.validationReceiptSha256,
      binding?.resultBody?.validationProjectionSha256,
      binding?.resultSha256,
      binding?.artifactSha256,
      binding?.bindingSha256,
    ])
    .filter((value) => HASH_RE.test(value ?? ""));
}

function validateActiveValidationReceipt(
  resultBody,
  expectedSlot,
  controlPlane,
  controlPlaneSha256,
  issues,
  path,
) {
  const projection = resultBody?.validationProjection;
  const body = projection?.validationReceiptBody;
  if (!isObject(projection) || !isObject(body)) return;

  compareBinding(
    issues,
    projection.validationReceiptSha256,
    computeValidationReceiptSha256(body),
    `${path}.validationProjection.validationReceiptSha256`,
    "ACTIVE_VALIDATION_RECEIPT_DIGEST_MISMATCH",
  );
  compareBinding(
    issues,
    body.slot,
    expectedSlot,
    `${path}.validationProjection.validationReceiptBody.slot`,
    "ACTIVE_VALIDATION_RECEIPT_SLOT_MISMATCH",
  );
  compareBinding(
    issues,
    body.controlPlaneSha256,
    controlPlaneSha256,
    `${path}.validationProjection.validationReceiptBody.controlPlaneSha256`,
    "ACTIVE_VALIDATION_RECEIPT_CONTROL_PLANE_MISMATCH",
  );
  compareBinding(
    issues,
    body.projectionManifestSha256,
    controlPlane?.projectionManifestSha256,
    `${path}.validationProjection.validationReceiptBody.projectionManifestSha256`,
    "ACTIVE_VALIDATION_RECEIPT_PROJECTION_MISMATCH",
  );
  compareBinding(
    issues,
    body.evidenceSchemaVersion,
    controlPlane?.evidenceSchemaVersion,
    `${path}.validationProjection.validationReceiptBody.evidenceSchemaVersion`,
    "ACTIVE_VALIDATION_RECEIPT_SCHEMA_MISMATCH",
  );
  compareBinding(
    issues,
    body.taxonomyVersion,
    controlPlane?.taxonomyVersion,
    `${path}.validationProjection.validationReceiptBody.taxonomyVersion`,
    "ACTIVE_VALIDATION_RECEIPT_TAXONOMY_MISMATCH",
  );
  const expectedRole = expectedValidationRoleForSlot(expectedSlot);
  if (body.expectedRole !== expectedRole || body.observedRole !== expectedRole) {
    addIssue(
      issues,
      "ACTIVE_VALIDATION_RECEIPT_ROLE_MISMATCH",
      `${path}.validationProjection.validationReceiptBody.expectedRole`,
    );
  }
  compareBinding(
    issues,
    body.responseDigestSha256,
    resultBody.outputDigestSha256,
    `${path}.validationProjection.validationReceiptBody.responseDigestSha256`,
    "ACTIVE_VALIDATION_RECEIPT_RESPONSE_MISMATCH",
  );
  if (!Number.isSafeInteger(body.responseByteLength) || body.responseByteLength < 1) {
    addIssue(
      issues,
      "ACTIVE_VALIDATION_RECEIPT_RESPONSE_EMPTY",
      `${path}.validationProjection.validationReceiptBody.responseByteLength`,
    );
  }
  for (const field of [
    "parseStatus",
    "projectionStatus",
    "schemaStatus",
    "roleStatus",
    "taxonomyStatus",
  ]) {
    if (body[field] !== "passed") {
      addIssue(
        issues,
        "ACTIVE_VALIDATION_RECEIPT_CHECK_NOT_PASSED",
        `${path}.validationProjection.validationReceiptBody.${field}`,
      );
    }
  }
  const coverage = body.surfaceCoverage;
  if (
    !isObject(coverage) ||
    coverage.status !== "passed" ||
    !Number.isSafeInteger(coverage.expectedCount) ||
    coverage.expectedCount < 1 ||
    coverage.inspectedCount !== coverage.expectedCount ||
    coverage.inspectedSurfaceSetSha256 !== coverage.expectedSurfaceSetSha256
  ) {
    addIssue(
      issues,
      "ACTIVE_VALIDATION_RECEIPT_COVERAGE_MISMATCH",
      `${path}.validationProjection.validationReceiptBody.surfaceCoverage`,
    );
  }
  const expectedRedaction = {
    protectedContentIncluded: false,
    credentialsIncluded: false,
    rawProviderResponsesIncluded: false,
  };
  if (
    !deepEqual(body.redaction, expectedRedaction) ||
    !deepEqual(projection.redaction, expectedRedaction) ||
    !deepEqual(body.redaction, projection.redaction)
  ) {
    addIssue(
      issues,
      "ACTIVE_VALIDATION_RECEIPT_REDACTION_MISMATCH",
      `${path}.validationProjection.validationReceiptBody.redaction`,
    );
  }
}

function validateReceiptBindingManifest(manifest, issues, path, expectedIdentity = null) {
  if (!isObject(manifest)) return;
  const controlPlane = manifest.controlPlane;
  if (!isObject(controlPlane)) return;
  const controlPlaneSha256 = canonicalSha256(controlPlane);
  const c0Assessment = controlPlane.c0TriggerAssessment;
  if (isObject(c0Assessment)) {
    const assessmentTriggers = Array.isArray(c0Assessment.triggerCodes)
      ? c0Assessment.triggerCodes
      : [];
    const derivedC0Required = assessmentTriggers.some((code) => C0_TRIGGER_CODES.has(code));
    if (
      c0Assessment.c0Required !== derivedC0Required ||
      manifest.c0Required !== derivedC0Required
    ) {
      addIssue(issues, "C0_TRIGGER_ASSESSMENT_MISMATCH", `${path}.controlPlane.c0TriggerAssessment`);
    }
  }
  compareBinding(
    issues,
    manifest.controlPlaneSha256,
    controlPlaneSha256,
    `${path}.controlPlaneSha256`,
    "ACTIVE_CONTROL_PLANE_DIGEST_MISMATCH",
  );
  if (isObject(expectedIdentity) && !deepEqual(controlPlane, expectedIdentity)) {
    addIssue(issues, "ACTIVE_CONTROL_PLANE_IDENTITY_MISMATCH", `${path}.controlPlane`);
  }
  const expectedSlots = new Set([
    ...BASE_RECEIPT_SLOTS,
    ...(manifest.c0Required === true ? C0_ROLES.map(c0Slot) : []),
    INDEPENDENT_RECEIPT_SLOT,
  ]);
  const entries = manifestBindingEntries(manifest);
  const actualSlots = entries.map(([slot]) => slot);
  if (
    actualSlots.length !== expectedSlots.size ||
    actualSlots.some((slot) => !expectedSlots.has(slot)) ||
    entries.some(([, binding]) => !isObject(binding))
  ) {
    addIssue(issues, "ACTIVE_RECEIPT_SLOT_SET_MISMATCH", `${path}.bindings`);
  }
  for (const [expectedSlot, binding] of entries) {
    if (!isObject(binding)) continue;
    if (binding.slot !== expectedSlot) {
      addIssue(issues, "ACTIVE_RECEIPT_SLOT_MISMATCH", `${path}.bindings`);
    }
    compareBinding(
      issues,
      binding.controlPlaneSha256,
      controlPlaneSha256,
      `${path}.bindings`,
      "ACTIVE_RECEIPT_CONTROL_PLANE_MISMATCH",
    );
    const resultBody = binding.resultBody;
    if (isObject(resultBody)) {
      if (resultBody.slot !== expectedSlot) {
        addIssue(issues, "ACTIVE_RESULT_SLOT_MISMATCH", `${path}.bindings`);
      }
      if (!deepEqual(resultBody.controlPlane, controlPlane)) {
        addIssue(issues, "ACTIVE_RESULT_CONTROL_PLANE_MISMATCH", `${path}.bindings`);
      }
      compareBinding(
        issues,
        resultBody.controlPlaneSha256,
        controlPlaneSha256,
        `${path}.bindings`,
        "ACTIVE_RESULT_CONTROL_PLANE_MISMATCH",
      );
      const validationProjection = resultBody.validationProjection;
      if (isObject(validationProjection)) {
        validateActiveValidationReceipt(
          resultBody,
          expectedSlot,
          controlPlane,
          controlPlaneSha256,
          issues,
          `${path}.bindings.${expectedSlot}.resultBody`,
        );
        compareBinding(
          issues,
          validationProjection.projectionManifestSha256,
          controlPlane.projectionManifestSha256,
          `${path}.bindings`,
          "ACTIVE_RESULT_VALIDATION_PROJECTION_MISMATCH",
        );
        if (!deepEqual(validationProjection.redaction, {
          protectedContentIncluded: false,
          credentialsIncluded: false,
          rawProviderResponsesIncluded: false,
        })) {
          addIssue(issues, "ACTIVE_RESULT_VALIDATION_PROJECTION_MISMATCH", `${path}.bindings`);
        }
        compareBinding(
          issues,
          resultBody.validationProjectionSha256,
          canonicalSha256(validationProjection),
          `${path}.bindings`,
          "ACTIVE_RESULT_VALIDATION_PROJECTION_DIGEST_MISMATCH",
        );
      }
      const expectedResult = computeResultSha256(resultBody);
      compareBinding(
        issues,
        binding.resultSha256,
        expectedResult,
        `${path}.bindings`,
        "ACTIVE_RECEIPT_RESULT_DIGEST_MISMATCH",
      );
    }
    if (HASH_RE.test(binding.resultSha256 ?? "")) {
      const expectedArtifact = computeReceiptArtifactSha256(
        expectedSlot,
        binding.resultSha256,
        controlPlaneSha256,
      );
      compareBinding(
        issues,
        binding.artifactSha256,
        expectedArtifact,
        `${path}.bindings`,
        "ACTIVE_RECEIPT_ARTIFACT_DIGEST_MISMATCH",
      );
    }
    if (HASH_RE.test(binding.artifactSha256 ?? "")) {
      const expectedBinding = computeBoundReceiptSha256(
        expectedSlot,
        binding.artifactSha256,
        controlPlaneSha256,
      );
      compareBinding(
        issues,
        binding.bindingSha256,
        expectedBinding,
        `${path}.bindings`,
        "ACTIVE_RECEIPT_BINDING_DIGEST_MISMATCH",
      );
    }
  }
  const critiqueBinding = manifest.bindings?.bPrimeCritique;
  const revisionResult = manifest.bindings?.bPrimeRevision?.resultBody;
  if (
    isObject(critiqueBinding) &&
    isObject(revisionResult) &&
    (
      revisionResult.predecessorReceiptSha256 !== critiqueBinding.bindingSha256 ||
      revisionResult.critiqueThenRevision !== true ||
      revisionResult.freshContext !== true
    )
  ) {
    addIssue(issues, "B_PRIME_PREDECESSOR_MISMATCH", `${path}.bindings.bPrimeRevision`);
  }
  const expectedManifestSha = computeActiveReceiptManifestSha256(manifest);
  compareBinding(
    issues,
    manifest.manifestSha256,
    expectedManifestSha,
    `${path}.manifestSha256`,
    "ACTIVE_RECEIPT_MANIFEST_DIGEST_MISMATCH",
  );
  if (manifest.c0Required === true && manifest.c0Status !== "complete") {
    addIssue(issues, "ACTIVE_RECEIPT_C0_STATE_MISMATCH", `${path}.c0Status`);
  }
  if (manifest.c0Required === false && manifest.c0Status !== "not-required") {
    addIssue(issues, "ACTIVE_RECEIPT_C0_STATE_MISMATCH", `${path}.c0Status`);
  }
  const outputs = entries
    .map(([, binding]) => binding?.resultBody?.outputDigestSha256)
    .filter((value) => HASH_RE.test(value ?? ""));
  const validationHashes = entries
    .flatMap(([, binding]) => [
      binding?.resultBody?.validationProjection?.validationReceiptSha256,
      binding?.resultBody?.validationProjectionSha256,
    ])
    .filter((value) => HASH_RE.test(value ?? ""));
  const results = entries
    .map(([, binding]) => binding?.resultSha256)
    .filter((value) => HASH_RE.test(value ?? ""));
  const artifacts = entries
    .map(([, binding]) => binding?.artifactSha256)
    .filter((value) => HASH_RE.test(value ?? ""));
  const bindings = entries
    .map(([, binding]) => binding?.bindingSha256)
    .filter((value) => HASH_RE.test(value ?? ""));
  if (
    new Set(outputs).size !== outputs.length ||
    new Set(validationHashes).size !== validationHashes.length ||
    new Set(results).size !== results.length ||
    new Set(artifacts).size !== artifacts.length ||
    new Set(bindings).size !== bindings.length
  ) {
    addIssue(issues, "ACTIVE_RECEIPT_MANIFEST_HASH_NOT_UNIQUE", `${path}.bindings`);
  }
  if (
    outputs.some((hash) => validationHashes.includes(hash) || results.includes(hash) || artifacts.includes(hash) || bindings.includes(hash)) ||
    validationHashes.some((hash) => results.includes(hash) || artifacts.includes(hash) || bindings.includes(hash)) ||
    results.some((hash) => artifacts.includes(hash) || bindings.includes(hash)) ||
    artifacts.some((hash) => bindings.includes(hash))
  ) {
    addIssue(issues, "ACTIVE_RECEIPT_ARTIFACT_BINDING_COLLISION", `${path}.bindings`);
  }
}

function validateCurrentActiveReceiptManifest(packet, issues) {
  const manifest = packet.activeReceiptManifest;
  validateReceiptBindingManifest(manifest, issues, "$.activeReceiptManifest", packet.identity);
  if (!isObject(manifest?.bindings)) return;
  const topBindings = [
    [manifest.bindings.deterministic?.bindingSha256, packet.deterministic?.receiptSha256],
    [manifest.bindings.bPrimeCritique?.bindingSha256, packet.bPrime?.critiqueReceiptSha256],
    [manifest.bindings.bPrimeRevision?.bindingSha256, packet.bPrime?.revisionReceiptSha256],
    [manifest.bindings.independentReview?.bindingSha256, packet.independentReviewState?.reviewReceiptSha256],
  ];
  for (const [manifestHash, topHash] of topBindings) {
    compareBinding(
      issues,
      topHash,
      manifestHash,
      "$.activeReceiptManifest.bindings",
      "TOP_LEVEL_RECEIPT_BINDING_MISMATCH",
    );
  }
  const critiqueReceipt = manifest.bindings.bPrimeCritique?.bindingSha256;
  const revisionBody = manifest.bindings.bPrimeRevision?.resultBody;
  if (
    packet.deterministic?.findingsCount !==
      manifest.bindings.deterministic?.resultBody?.findingsCount ||
    packet.bPrime?.findingsCount !== revisionBody?.findingsCount
  ) {
    addIssue(issues, "FINDING_COUNT_BINDING_MISMATCH", "$.activeReceiptManifest.bindings");
  }
  if (
    packet.bPrime?.critiqueThenRevision !== true ||
    packet.bPrime?.freshContext !== true ||
    packet.bPrime?.revisionPredecessorReceiptSha256 !== critiqueReceipt ||
    revisionBody?.predecessorReceiptSha256 !== critiqueReceipt ||
    revisionBody?.critiqueThenRevision !== true ||
    revisionBody?.freshContext !== true
  ) {
    addIssue(issues, "B_PRIME_PREDECESSOR_MISMATCH", "$.bPrime");
  }
  if (
    manifest.c0Required !== packet.c0Prime?.required ||
    manifest.c0Status !== packet.c0Prime?.status
  ) {
    addIssue(issues, "ACTIVE_RECEIPT_C0_STATE_MISMATCH", "$.activeReceiptManifest");
  }
  const manifestC0 = isObject(manifest.bindings.c0Roles) ? manifest.bindings.c0Roles : {};
  const topC0 = isObject(packet.c0Prime?.roles) ? packet.c0Prime.roles : {};
  if (packet.c0Prime?.required === true) {
    for (const role of C0_ROLES) {
      compareBinding(
        issues,
        topC0[role]?.receiptSha256,
        manifestC0[role]?.bindingSha256,
        `$.activeReceiptManifest.bindings.c0Roles.${role}`,
        "TOP_LEVEL_RECEIPT_BINDING_MISMATCH",
      );
    }
  }
}

function activeReceiptHashes(packet) {
  if (isObject(packet.activeReceiptManifest)) {
    const artifacts = manifestBindingEntries(packet.activeReceiptManifest)
      .flatMap(([, binding]) => [
        binding?.resultBody?.outputDigestSha256,
        binding?.resultBody?.validationProjection?.validationReceiptSha256,
        binding?.resultBody?.validationProjectionSha256,
        binding?.resultSha256,
        binding?.artifactSha256,
      ])
      .filter((value) => HASH_RE.test(value ?? ""));
    return [
      ...artifacts,
      packet.deterministic?.receiptSha256,
      packet.bPrime?.critiqueReceiptSha256,
      packet.bPrime?.revisionReceiptSha256,
      ...(isObject(packet.c0Prime?.roles)
        ? Object.values(packet.c0Prime.roles).map((role) => role?.receiptSha256)
        : []),
      packet.independentReviewState?.reviewReceiptSha256,
    ].filter((value) => HASH_RE.test(value ?? ""));
  }
  return [
    packet.deterministic?.receiptSha256,
    packet.bPrime?.critiqueReceiptSha256,
    packet.bPrime?.revisionReceiptSha256,
    ...(isObject(packet.c0Prime?.roles)
      ? Object.values(packet.c0Prime.roles).map((role) => role?.receiptSha256)
      : []),
    packet.independentReviewState?.reviewReceiptSha256,
  ].filter((value) => HASH_RE.test(value ?? ""));
}

function collectReservedDomainHashes(packet, options = {}) {
  const reservedHashes = new Set();
  const reserve = (value) => {
    if (HASH_RE.test(value ?? "")) reservedHashes.add(value);
  };
  for (const field of [
    "candidateSha256",
    "manifestSha256",
    "codeManifestSha256",
    "promptManifestSha256",
    "projectionManifestSha256",
  ]) reserve(packet.identity?.[field]);
  for (const source of packet.sourceIdentity ?? []) reserve(source?.sha256);
  reserve(packet.activeReceiptManifest?.controlPlaneSha256);
  reserve(packet.activeReceiptManifest?.manifestSha256);
  for (const check of packet.checks ?? []) {
    if (typeof check?.evidenceRef === "string" && check.evidenceRef.startsWith("sha256:")) {
      reserve(check.evidenceRef.slice("sha256:".length));
    }
  }
  for (const boundary of Object.values(packet.proofBoundaries ?? {})) {
    reserve(boundary?.evidenceSha256);
  }
  if (packet.authorization?.liveProviderUsed === true) {
    for (const field of [
      "authorizationSha256",
      "candidateSha256",
      "codeManifestSha256",
      "runnerSha256",
    ]) reserve(packet.authorization[field]);
    const trust = packet.authorization.authorizationTrustAnchor;
    for (const field of [
      "sourceIdentitySha256",
      "externalReceiptSha256",
      "boundReceiptSha256",
      "receiptIdentitySha256",
    ]) reserve(trust?.[field]);
    for (const file of packet.executableCodeManifest?.files ?? []) reserve(file?.sha256);
  }
  if (packet.remediation?.candidateMutated === true) {
    if (options.includeDPrimeValidation !== false) {
      reserve(packet.remediation.validationReceiptSha256);
    }
    reserve(packet.remediation.validationReceiptBody?.invalidatedReceiptSetSha256);
    reserve(packet.remediation.validationReceiptBody?.currentActiveReceiptSetSha256);
    for (const value of packet.remediation.invalidatedReceiptHashes ?? []) reserve(value);
    const prior = packet.remediation.priorReceiptBindings;
    reserve(prior?.priorEnvelopeSha256);
    reserve(prior?.activeReceiptManifestSha256);
    const trust = prior?.priorTrustAnchor;
    for (const field of [
      "sourceIdentitySha256",
      "externalReceiptSha256",
      "boundReceiptSha256",
      "receiptIdentitySha256",
    ]) reserve(trust?.[field]);
  }
  return reservedHashes;
}

function validateGlobalEvidenceIndependence(packet, issues) {
  const receipts = activeReceiptHashes(packet);
  const receiptSet = new Set(receipts);
  if (receiptSet.size !== receipts.length) {
    addIssue(issues, "ACTIVE_RECEIPT_HASH_NOT_UNIQUE", "$.evidenceHashes");
  }
  for (const name of PROOF_BOUNDARIES) {
    const boundary = packet.proofBoundaries?.[name];
    if (boundary?.status === "passed" && receiptSet.has(boundary.evidenceSha256)) {
      addIssue(
        issues,
        "PROOF_HASH_REUSES_ACTIVE_RECEIPT",
        `$.proofBoundaries.${name}.evidenceSha256`,
      );
    }
  }

  const validationReceiptHashes = manifestBindingEntries(packet.activeReceiptManifest)
    .map(([, binding]) =>
      binding?.resultBody?.validationProjection?.validationReceiptSha256)
    .filter((value) => HASH_RE.test(value ?? ""));
  const reservedHashes = collectReservedDomainHashes(packet);
  if (validationReceiptHashes.some((hash) => reservedHashes.has(hash))) {
    addIssue(
      issues,
      "ACTIVE_VALIDATION_RECEIPT_DOMAIN_COLLISION",
      "$.activeReceiptManifest.bindings",
    );
  }
}

function validateCurrentnessAndIndependentReview(packet, issues, nowMs) {
  const identity = packet.identity;
  const currentness = packet.currentness;
  if (isObject(identity) && isObject(currentness)) {
    compareBinding(
      issues,
      currentness.boundCandidateSha256,
      identity.candidateSha256,
      "$.currentness.boundCandidateSha256",
    );
  }
  const observed = Date.parse(packet.observedAt);
  const checked = Date.parse(currentness?.checkedAt);
  if (Number.isFinite(observed) && observed > nowMs) addIssue(issues, "OBSERVED_AT_IN_FUTURE", "$.observedAt");
  if (Number.isFinite(checked) && checked > nowMs) addIssue(issues, "CURRENTNESS_CHECK_IN_FUTURE", "$.currentness.checkedAt");
  if (Number.isFinite(observed) && Number.isFinite(checked) && observed > checked) {
    addIssue(issues, "CURRENTNESS_TEMPORAL_ORDER_INVALID", "$.currentness.checkedAt");
  }

  const review = packet.independentReviewState;
  if (!isObject(review) || !isObject(identity)) return;
  compareBinding(
    issues,
    review.boundCandidateSha256,
    identity.candidateSha256,
    "$.independentReviewState.boundCandidateSha256",
    "INDEPENDENT_REVIEW_CANDIDATE_MISMATCH",
  );
  if (packet.status === "complete" && review.status !== "passed") {
    addIssue(issues, "INDEPENDENT_REVIEW_NOT_PASSED", "$.independentReviewState.status");
  }
  if (review.status === "passed") {
    if (review.freshContext !== true) {
      addIssue(issues, "INDEPENDENT_REVIEW_NOT_FRESH", "$.independentReviewState.freshContext");
    }
    if (!HASH_RE.test(review.reviewReceiptSha256 ?? "")) {
      addIssue(issues, "INDEPENDENT_REVIEW_RECEIPT_MISSING", "$.independentReviewState.reviewReceiptSha256");
    }
    const dependentReceipts = [
      packet.deterministic?.receiptSha256,
      packet.bPrime?.critiqueReceiptSha256,
      packet.bPrime?.revisionReceiptSha256,
      ...(isObject(packet.c0Prime?.roles)
        ? Object.values(packet.c0Prime.roles).map((role) => role?.receiptSha256)
        : []),
    ];
    if (dependentReceipts.includes(review.reviewReceiptSha256)) {
      addIssue(issues, "INDEPENDENT_REVIEW_RECEIPT_REUSED", "$.independentReviewState.reviewReceiptSha256");
    }
  }
}

function validateProofBoundaries(packet, issues) {
  const boundaries = packet.proofBoundaries;
  if (!isObject(boundaries)) return;
  const passedHashes = [];
  for (const name of PROOF_BOUNDARIES) {
    const boundary = boundaries[name];
    if (!isObject(boundary)) continue;
    if (boundary.status === "passed") {
      if (!HASH_RE.test(boundary.evidenceSha256 ?? "")) {
        addIssue(issues, "PROOF_BOUNDARY_HASH_MISSING", `$.proofBoundaries.${name}.evidenceSha256`);
      } else {
        passedHashes.push(boundary.evidenceSha256);
      }
    }
    if (
      (boundary.status === "unverified" || boundary.status === "not-applicable") &&
      boundary.evidenceSha256 !== null
    ) {
      addIssue(issues, "PROOF_BOUNDARY_UNVERIFIED_HASH", `$.proofBoundaries.${name}.evidenceSha256`);
    }
  }
  if (new Set(passedHashes).size !== passedHashes.length) {
    addIssue(issues, "PROOF_BOUNDARY_HASH_REUSED", "$.proofBoundaries");
  }
  if (packet.status === "complete" && boundaries.receipt?.status !== "passed") {
    addIssue(issues, "RECEIPT_PROOF_NOT_PASSED", "$.proofBoundaries.receipt.status");
  }
}

function validateC0(packet, issues) {
  const c0 = packet.c0Prime;
  const assessment = packet.identity?.c0TriggerAssessment;
  if (isObject(assessment)) {
    const triggerCodes = Array.isArray(assessment.triggerCodes)
      ? assessment.triggerCodes
      : [];
    const derivedRequired = triggerCodes.some((code) => C0_TRIGGER_CODES.has(code));
    if (assessment.c0Required !== derivedRequired) {
      addIssue(issues, "C0_TRIGGER_ASSESSMENT_MISMATCH", "$.identity.c0TriggerAssessment");
    }
    if (
      c0?.required !== derivedRequired ||
      (derivedRequired && (
        c0?.status !== "complete" ||
        !deepEqual(c0?.triggers, triggerCodes)
      ))
    ) {
      addIssue(issues, "C0_TRIGGER_ASSESSMENT_MISMATCH", "$.c0Prime");
    }
    if (derivedRequired && c0?.required !== true) {
      addIssue(issues, "C0_TRIGGER_REQUIRES_FIVE_ROLE_REVIEW", "$.c0Prime");
    }
  }
  if (!isObject(c0) || c0.required !== true || !isObject(c0.roles)) return;
  const roles = Object.keys(c0.roles);
  if (
    roles.length !== C0_ROLES.length ||
    new Set(roles).size !== C0_ROLES.length ||
    C0_ROLES.some((role) => !roles.includes(role))
  ) {
    addIssue(issues, "C0_FIVE_ROLE_SET_INCOMPLETE", "$.c0Prime.roles");
  }
  const receiptHashes = Object.values(c0.roles)
    .map((result) => result?.receiptSha256)
    .filter((hash) => HASH_RE.test(hash ?? ""));
  if (new Set(receiptHashes).size !== receiptHashes.length) {
    addIssue(issues, "C0_ROLE_RECEIPT_REUSED", "$.c0Prime.roles");
  }
}

function validateExecutableCodeManifest(packet, issues, runtimeEvidence) {
  const manifest = packet.executableCodeManifest;
  if (!isObject(manifest)) return;
  const digest = computeExecutableCodeManifestSha256(manifest);
  for (const [value, path, code] of [
    [packet.identity?.codeManifestSha256, "$.identity.codeManifestSha256", "EXECUTABLE_CODE_MANIFEST_DIGEST_MISMATCH"],
    [packet.authorization?.codeManifestSha256, "$.authorization.codeManifestSha256", "LIVE_AUTHORIZATION_CODE_MANIFEST_MISMATCH"],
    [packet.authorization?.authorizationProjection?.codeManifestSha256, "$.authorization.authorizationProjection.codeManifestSha256", "LIVE_AUTHORIZATION_CODE_MANIFEST_MISMATCH"],
    [packet.liveExecution?.codeManifestSha256, "$.liveExecution.codeManifestSha256", "LIVE_EXECUTION_CODE_MANIFEST_MISMATCH"],
    [runtimeEvidence?.codeManifestSha256, "$.liveExecution.codeManifestSha256", "LIVE_RUNTIME_CODE_MANIFEST_MISMATCH"],
  ]) compareBinding(issues, value, digest, path, code);
  compareBinding(
    issues,
    manifest.repositoryCommit,
    packet.repository?.head,
    "$.executableCodeManifest.repositoryCommit",
    "EXECUTABLE_CODE_MANIFEST_COMMIT_MISMATCH",
  );
  compareBinding(
    issues,
    manifest.entrypoint,
    packet.liveExecution?.runnerPath,
    "$.executableCodeManifest.entrypoint",
    "EXECUTABLE_CODE_MANIFEST_ENTRYPOINT_MISMATCH",
  );
  if (manifest.runtime?.engine !== "node" || manifest.runtime?.version !== runtimeEvidence?.runtimeVersion) {
    addIssue(
      issues,
      "EXECUTABLE_CODE_MANIFEST_RUNTIME_MISMATCH",
      "$.executableCodeManifest.runtime",
    );
  }
  const files = Array.isArray(manifest.files) ? manifest.files : [];
  const paths = files.map((file) => file?.path);
  const sortedPaths = [...paths].sort((a, b) => String(a).localeCompare(String(b)));
  if (
    paths.length < 3 ||
    new Set(paths).size !== paths.length ||
    !deepEqual(paths, sortedPaths) ||
    paths.some((value) =>
      typeof value !== "string" ||
      !EXECUTABLE_PATH_RE.test(value) ||
      isAbsolute(value) ||
      value.includes("\\") ||
      value.split("/").includes(".."))
  ) {
    addIssue(
      issues,
      "EXECUTABLE_CODE_MANIFEST_PATH_SET_INVALID",
      "$.executableCodeManifest.files",
    );
  }
  const entrypoints = files.filter((file) => file?.kind === "entrypoint");
  const packageManifests = files.filter((file) => file?.kind === "package-manifest");
  const lockfiles = files.filter((file) => file?.kind === "dependency-lock");
  if (
    entrypoints.length !== 1 ||
    entrypoints[0]?.path !== manifest.entrypoint ||
    entrypoints[0]?.mode !== "100755" ||
    entrypoints[0]?.sha256 !== packet.liveExecution?.runnerSha256 ||
    packageManifests.length !== 1 ||
    packageManifests[0]?.path !== "package.json" ||
    lockfiles.length !== 1 ||
    lockfiles[0]?.path !== "package-lock.json"
  ) {
    addIssue(
      issues,
      "EXECUTABLE_CODE_MANIFEST_REQUIRED_FILES_INVALID",
      "$.executableCodeManifest.files",
    );
  }
  if (
    files.some((file) =>
      (file?.kind === "entrypoint" && file?.mode !== "100755") ||
      (file?.kind !== "entrypoint" && file?.mode !== "100644"))
  ) {
    addIssue(
      issues,
      "EXECUTABLE_CODE_MANIFEST_MODE_INVALID",
      "$.executableCodeManifest.files",
    );
  }
  if (
    (manifest.unresolvedImports?.length ?? 0) !== 0 ||
    (manifest.computedDynamicImports?.length ?? 0) !== 0 ||
    (manifest.customLoaders?.length ?? 0) !== 0 ||
    runtimeEvidence?.codeManifestCurrent !== true ||
    runtimeEvidence?.codeManifestClosureValid !== true
  ) {
    addIssue(
      issues,
      "EXECUTABLE_CODE_MANIFEST_CLOSURE_UNPROVEN",
      "$.executableCodeManifest",
    );
  }
}

function hasCanonicalCompleteC0Review(packet) {
  const c0 = packet.c0Prime;
  const assessment = packet.identity?.c0TriggerAssessment;
  const manifest = packet.activeReceiptManifest;
  if (
    c0?.required !== true ||
    c0?.status !== "complete" ||
    assessment?.assessed !== true ||
    assessment?.c0Required !== true ||
    manifest?.c0Required !== true ||
    manifest?.c0Status !== "complete" ||
    !isObject(c0.roles)
  ) {
    return false;
  }
  const roles = Object.keys(c0.roles);
  return roles.length === C0_ROLES.length &&
    C0_ROLES.every((role) =>
      roles.includes(role) &&
      c0.roles[role]?.status === "complete" &&
      c0.roles[role]?.inspectionComplete === true);
}

function validateLiveAuthorization(packet, issues, nowMs, runtimeEvidence) {
  const authorization = packet.authorization;
  if (!isObject(authorization)) return;
  const live = authorization.liveProviderUsed === true;
  if (!live) {
    if (packet.mode === "authorized-live-run" || packet.liveExecution !== undefined) {
      addIssue(issues, "LIVE_RUN_MODE_MISMATCH", "$.mode");
    }
    return;
  }

  validateExecutableCodeManifest(packet, issues, runtimeEvidence);

  if (packet.mode !== "authorized-live-run") addIssue(issues, "LIVE_RUN_MODE_MISMATCH", "$.mode");
  const execution = packet.liveExecution;
  const identity = packet.identity;
  const repository = packet.repository;
  const currentness = packet.currentness;
  const projection = authorization.authorizationProjection;
  const trustAnchor = authorization.authorizationTrustAnchor;
  const issued = Date.parse(authorization.issuedAt);
  const observed = Date.parse(packet.observedAt);
  const called = Date.parse(execution?.callAt);
  const checked = Date.parse(currentness?.checkedAt);
  const expires = Date.parse(authorization.expiresAt);
  if (
    ![issued, observed, called, checked, expires].every(Number.isFinite) ||
    !(issued <= observed && observed <= called && called <= checked && checked <= nowMs && nowMs < expires)
  ) {
    addIssue(issues, "LIVE_AUTHORIZATION_TEMPORAL_ORDER_INVALID", "$.authorization");
  }
  if (packet.authority?.expiresAt !== authorization.expiresAt) {
    addIssue(issues, "LIVE_AUTHORITY_EXPIRY_MISMATCH", "$.authority.expiresAt");
  }
  if (isObject(projection)) {
    const computedAuthorizationSha = computeAuthorizationSha256(projection);
    compareBinding(
      issues,
      authorization.authorizationSha256,
      computedAuthorizationSha,
      "$.authorization.authorizationSha256",
      "LIVE_AUTHORIZATION_DIGEST_MISMATCH",
    );
    const topProjectionPairs = [
      ["authorizationId", authorization.authorizationId],
      ["issuedAt", authorization.issuedAt],
      ["expiresAt", authorization.expiresAt],
      ["policyVersion", authorization.policyVersion],
      ["protocolId", authorization.protocolId],
      ["protocolVersion", authorization.protocolVersion],
      ["candidateSha256", authorization.candidateSha256],
      ["codeManifestSha256", authorization.codeManifestSha256],
      ["runnerLogicalId", authorization.runnerLogicalId],
      ["runnerPath", authorization.runnerPath],
      ["runnerSha256", authorization.runnerSha256],
      ["provider", authorization.provider],
      ["model", authorization.model],
      ["credentialAccessScope", authorization.credentialAccessScope],
      ["egressScope", authorization.egressScope],
      ["privacyRightsScope", authorization.privacyRightsScope],
      ["attemptCap", authorization.attemptCap],
      ["tokenCap", authorization.tokenCap],
      ["currencyCapUsd", authorization.currencyCapUsd],
    ];
    for (const [field, topValue] of topProjectionPairs) {
      if (!deepEqual(projection[field], topValue)) {
        addIssue(issues, "LIVE_AUTHORIZATION_PROJECTION_MISMATCH", `$.authorization.${field}`);
      }
    }
    if (!deepEqual(projection.allowedRoles, authorization.allowedRoles)) {
      addIssue(issues, "LIVE_AUTHORIZATION_PROJECTION_MISMATCH", "$.authorization.allowedRoles");
    }
  }
  validateTrustAnchor(
    packet,
    trustAnchor,
    "live-authorization",
    authorization.authorizationSha256,
    issues,
    "$.authorization.authorizationTrustAnchor",
    nowMs,
  );
  const trustVerifiedAt = Date.parse(trustAnchor?.verifiedAt);
  if (Number.isFinite(issued) && Number.isFinite(trustVerifiedAt) && issued > trustVerifiedAt) {
    addIssue(issues, "LIVE_TRUST_VERIFICATION_PRECEDES_ISSUANCE", "$.authorization.authorizationTrustAnchor.verifiedAt");
  }

  if (isObject(identity)) {
    for (const field of [
      "policyVersion",
      "protocolId",
      "protocolVersion",
      "candidateSha256",
      "codeManifestSha256",
    ]) {
      compareBinding(issues, authorization[field], identity[field], `$.authorization.${field}`, "LIVE_AUTHORIZATION_BINDING_MISMATCH");
    }
    if (isObject(projection)) {
      for (const field of [
        "candidateId",
        "candidateVersion",
        "candidateSha256",
        "manifestSha256",
        "policyVersion",
        "protocolId",
        "protocolVersion",
        "codeManifestSha256",
        "taxonomyVersion",
        "evidenceSchemaVersion",
        "promptManifestSha256",
        "projectionManifestSha256",
      ]) {
        if (!deepEqual(projection[field], identity[field])) {
          addIssue(issues, "LIVE_AUTHORIZATION_CONTROL_PLANE_MISMATCH", `$.authorization.authorizationProjection.${field}`);
        }
      }
    }
  }
  if (isObject(execution) && isObject(identity) && isObject(repository)) {
    for (const field of ["runnerLogicalId", "runnerPath", "runnerSha256"]) {
      compareBinding(
        issues,
        execution[field],
        authorization[field],
        `$.liveExecution.${field}`,
        "LIVE_RUNNER_AUTHORIZATION_BINDING_MISMATCH",
      );
    }
    compareBinding(issues, execution.repositoryCommit, repository.head, "$.liveExecution.repositoryCommit", "LIVE_RUNNER_REPOSITORY_MISMATCH");
    compareBinding(issues, execution.promptManifestSha256, identity.promptManifestSha256, "$.liveExecution.promptManifestSha256", "LIVE_RUNNER_PROMPT_MISMATCH");
    compareBinding(issues, execution.projectionManifestSha256, identity.projectionManifestSha256, "$.liveExecution.projectionManifestSha256", "LIVE_RUNNER_PROJECTION_MISMATCH");
    if (isObject(projection)) {
      compareBinding(issues, projection.repositoryCommit, repository.head, "$.authorization.authorizationProjection.repositoryCommit", "LIVE_AUTHORIZATION_REPOSITORY_MISMATCH");
      for (const field of ["runnerLogicalId", "runnerPath", "runnerSha256"]) {
        compareBinding(issues, projection[field], execution[field], `$.authorization.authorizationProjection.${field}`, "LIVE_AUTHORIZATION_RUNNER_MISMATCH");
      }
    }
    if (
      typeof execution.runnerPath !== "string" ||
      !RUNNER_PATH_RE.test(execution.runnerPath) ||
      isAbsolute(execution.runnerPath) ||
      execution.runnerPath.split(/[\\/]/).includes("..") ||
      execution.runnerPath.includes("\\")
    ) {
      addIssue(issues, "LIVE_RUNNER_PATH_INVALID", "$.liveExecution.runnerPath");
    }
  }

  const allowed = Array.isArray(authorization.allowedRoles) ? authorization.allowedRoles : [];
  const performed = Array.isArray(execution?.performedRoles) ? execution.performedRoles : [];
  if (
    allowed.some((role) => !LIVE_ROLES.has(role)) ||
    performed.some((role) => !LIVE_ROLES.has(role)) ||
    performed.some((role) => !allowed.includes(role))
  ) {
    addIssue(issues, "LIVE_ROLE_SET_INVALID", "$.liveExecution.performedRoles");
  }
  const requiredRoles = [
    "b-prime-reviewer",
    ...(hasCanonicalCompleteC0Review(packet) ? C0_ROLES : []),
  ];
  if (requiredRoles.some((role) => !allowed.includes(role))) {
    addIssue(issues, "LIVE_REQUIRED_ROLE_NOT_PERFORMED", "$.liveExecution.performedRoles");
  }
  const performedSet = new Set(performed);
  if (
    performed.length !== requiredRoles.length ||
    performedSet.size !== requiredRoles.length ||
    requiredRoles.some((role) => !performedSet.has(role))
  ) {
    addIssue(issues, "LIVE_PERFORMED_ROLE_SET_MISMATCH", "$.liveExecution.performedRoles");
  }

  if (repository?.clean !== true || runtimeEvidence?.repositoryClean !== true) {
    addIssue(issues, "LIVE_REPOSITORY_NOT_CLEAN", "$.repository.clean");
  }
  if (runtimeEvidence?.packetInputQuarantined !== true) {
    addIssue(
      issues,
      "LIVE_PACKET_INPUT_NOT_QUARANTINED",
      "$.liveExecution",
    );
  }

  if (!runtimeEvidence?.available) {
    addIssue(issues, "LIVE_RUNNER_CURRENTNESS_UNPROVEN", "$.liveExecution");
  } else {
    if (runtimeEvidence.repositoryHead !== repository?.head) {
      addIssue(issues, "LIVE_RUNNER_HEAD_NOT_CURRENT", "$.liveExecution.repositoryCommit");
    }
    if (
      runtimeEvidence.repositoryBranch !== repository?.branch ||
      runtimeEvidence.repositoryClean !== repository?.clean
    ) {
      addIssue(issues, "LIVE_RUNNER_REPOSITORY_STATE_MISMATCH", "$.repository");
    }
    if (
      runtimeEvidence.runnerTracked !== true ||
      runtimeEvidence.runnerSha256 !== execution?.runnerSha256 ||
      runtimeEvidence.trackedRunnerSha256 !== execution?.runnerSha256
    ) {
      addIssue(issues, "LIVE_RUNNER_HASH_NOT_CURRENT", "$.liveExecution.runnerSha256");
    }
    if (
      runtimeEvidence.runnerExecutable !== true ||
      runtimeEvidence.trackedRunnerExecutable !== true ||
      runtimeEvidence.trackedRunnerMode !== "100755"
    ) {
      addIssue(issues, "LIVE_RUNNER_NOT_EXECUTABLE", "$.liveExecution.runnerPath");
    }
  }
}

function validateRemediation(packet, issues, nowMs) {
  const remediation = packet.remediation;
  if (!isObject(remediation) || remediation.candidateMutated !== true) return;
  const identity = packet.identity;
  const prior = remediation.priorCandidate;
  const priorBindings = remediation.priorReceiptBindings;
  const next = remediation.newCandidate;
  const bindings = remediation.newReceiptBindings;
  if (
    !isObject(identity) ||
    !isObject(prior) ||
    !isObject(priorBindings) ||
    !isObject(next) ||
    !isObject(bindings)
  ) return;

  const priorManifest = priorBindings.activeReceiptManifest;
  validateReceiptBindingManifest(
    priorManifest,
    issues,
    "$.remediation.priorReceiptBindings.activeReceiptManifest",
  );
  const priorEnvelopeBody = priorBindings.priorEnvelopeBody;
  if (isObject(priorEnvelopeBody)) {
    const expectedPriorCandidate = {
      id: prior.id,
      version: prior.version,
      sha256: prior.sha256,
    };
    if (!deepEqual(priorEnvelopeBody.priorCandidate, expectedPriorCandidate)) {
      addIssue(issues, "REMEDIATION_PRIOR_ENVELOPE_CANDIDATE_MISMATCH", "$.remediation.priorReceiptBindings.priorEnvelopeBody");
    }
    compareBinding(
      issues,
      priorEnvelopeBody.activeReceiptManifestSha256,
      priorManifest?.manifestSha256,
      "$.remediation.priorReceiptBindings.priorEnvelopeBody.activeReceiptManifestSha256",
      "REMEDIATION_PRIOR_ENVELOPE_MANIFEST_MISMATCH",
    );
    if (
      priorEnvelopeBody.c0Required !== priorManifest?.c0Required ||
      priorEnvelopeBody.c0Status !== priorManifest?.c0Status
    ) {
      addIssue(issues, "REMEDIATION_PRIOR_ENVELOPE_C0_MISMATCH", "$.remediation.priorReceiptBindings.priorEnvelopeBody");
    }
    const derivedPriorHashes = manifestActiveHashes(priorManifest);
    if (!deepEqual(priorEnvelopeBody.activeReceiptHashes, derivedPriorHashes)) {
      addIssue(issues, "REMEDIATION_PRIOR_ENVELOPE_ACTIVE_SET_MISMATCH", "$.remediation.priorReceiptBindings.priorEnvelopeBody.activeReceiptHashes");
    }
    compareBinding(
      issues,
      priorBindings.priorEnvelopeSha256,
      canonicalSha256(priorEnvelopeBody),
      "$.remediation.priorReceiptBindings.priorEnvelopeSha256",
      "REMEDIATION_PRIOR_ENVELOPE_DIGEST_MISMATCH",
    );
  }
  validateTrustAnchor(
    packet,
    priorBindings.priorTrustAnchor,
    "prior-envelope",
    priorBindings.priorEnvelopeSha256,
    issues,
    "$.remediation.priorReceiptBindings.priorTrustAnchor",
    nowMs,
  );

  if (prior.id === next.id || prior.version === next.version || prior.sha256 === next.sha256) {
    addIssue(issues, "REMEDIATION_CANDIDATE_IDENTITY_NOT_NEW", "$.remediation.newCandidate");
  }
  compareBinding(issues, next.id, identity.candidateId, "$.remediation.newCandidate.id", "REMEDIATION_NEW_CANDIDATE_MISMATCH");
  compareBinding(issues, next.version, identity.candidateVersion, "$.remediation.newCandidate.version", "REMEDIATION_NEW_CANDIDATE_MISMATCH");
  compareBinding(issues, next.sha256, identity.candidateSha256, "$.remediation.newCandidate.sha256", "REMEDIATION_NEW_CANDIDATE_MISMATCH");
  compareBinding(
    issues,
    prior.id,
    priorManifest?.controlPlane?.candidateId,
    "$.remediation.priorCandidate.id",
    "REMEDIATION_PRIOR_CANDIDATE_MISMATCH",
  );
  compareBinding(
    issues,
    prior.version,
    priorManifest?.controlPlane?.candidateVersion,
    "$.remediation.priorCandidate.version",
    "REMEDIATION_PRIOR_CANDIDATE_MISMATCH",
  );
  compareBinding(
    issues,
    prior.sha256,
    priorManifest?.controlPlane?.candidateSha256,
    "$.remediation.priorCandidate.sha256",
    "REMEDIATION_PRIOR_CANDIDATE_MISMATCH",
  );
  compareBinding(
    issues,
    priorBindings.activeReceiptManifestSha256,
    priorManifest?.manifestSha256,
    "$.remediation.priorReceiptBindings.activeReceiptManifestSha256",
    "REMEDIATION_PRIOR_MANIFEST_REFERENCE_MISMATCH",
  );
  if (
    priorBindings.c0Required !== priorManifest?.c0Required ||
    priorBindings.c0Status !== priorManifest?.c0Status
  ) {
    addIssue(issues, "REMEDIATION_PRIOR_C0_STATE_MISMATCH", "$.remediation.priorReceiptBindings");
  }
  for (const [bindingField, identityField] of [
    ["candidateId", "candidateId"],
    ["candidateVersion", "candidateVersion"],
    ["candidateSha256", "candidateSha256"],
    ["manifestSha256", "manifestSha256"],
    ["policyVersion", "policyVersion"],
    ["protocolId", "protocolId"],
    ["protocolVersion", "protocolVersion"],
    ["codeManifestSha256", "codeManifestSha256"],
    ["taxonomyVersion", "taxonomyVersion"],
    ["evidenceSchemaVersion", "evidenceSchemaVersion"],
    ["promptManifestSha256", "promptManifestSha256"],
    ["projectionManifestSha256", "projectionManifestSha256"],
  ]) {
    compareBinding(issues, bindings[bindingField], identity[identityField], `$.remediation.newReceiptBindings.${bindingField}`, "REMEDIATION_CONTROL_PLANE_MISMATCH");
  }
  compareBinding(
    issues,
    bindings.activeReceiptManifestSha256,
    packet.activeReceiptManifest?.manifestSha256,
    "$.remediation.newReceiptBindings.activeReceiptManifestSha256",
    "REMEDIATION_CONTROL_PLANE_MISMATCH",
  );
  for (const [bindingField, receipt] of [
    ["deterministicReceiptSha256", packet.deterministic?.receiptSha256],
    ["bPrimeCritiqueReceiptSha256", packet.bPrime?.critiqueReceiptSha256],
    ["bPrimeRevisionReceiptSha256", packet.bPrime?.revisionReceiptSha256],
    ["independentReviewReceiptSha256", packet.independentReviewState?.reviewReceiptSha256],
  ]) {
    compareBinding(issues, bindings[bindingField], receipt, `$.remediation.newReceiptBindings.${bindingField}`, "REMEDIATION_RECEIPT_BINDING_MISMATCH");
  }
  const c0Bindings = isObject(bindings.c0RoleReceipts) ? bindings.c0RoleReceipts : {};
  if (packet.c0Prime?.required === true) {
    const boundRoles = Object.keys(c0Bindings);
    if (
      boundRoles.length !== C0_ROLES.length ||
      new Set(boundRoles).size !== C0_ROLES.length ||
      C0_ROLES.some((role) => !boundRoles.includes(role))
    ) {
      addIssue(issues, "REMEDIATION_C0_BINDINGS_INCOMPLETE", "$.remediation.newReceiptBindings.c0RoleReceipts");
    }
    for (const role of C0_ROLES) {
      const top = packet.c0Prime.roles?.[role]?.receiptSha256;
      const bound = c0Bindings[role];
      compareBinding(issues, bound, top, "$.remediation.newReceiptBindings.c0RoleReceipts", "REMEDIATION_RECEIPT_BINDING_MISMATCH");
    }
  } else if (Object.keys(c0Bindings).length !== 0) {
    addIssue(issues, "REMEDIATION_C0_BINDINGS_UNEXPECTED", "$.remediation.newReceiptBindings.c0RoleReceipts");
  }

  const invalidated = Array.isArray(remediation.invalidatedReceiptHashes)
    ? remediation.invalidatedReceiptHashes
    : [];
  const priorC0Bindings = isObject(priorBindings.c0RoleReceipts) ? priorBindings.c0RoleReceipts : {};
  const priorManifestC0 = isObject(priorManifest?.bindings?.c0Roles)
    ? priorManifest.bindings.c0Roles
    : {};
  const priorReceiptPairs = [
    [priorBindings.deterministicReceiptSha256, priorManifest?.bindings?.deterministic?.bindingSha256],
    [priorBindings.bPrimeCritiqueReceiptSha256, priorManifest?.bindings?.bPrimeCritique?.bindingSha256],
    [priorBindings.bPrimeRevisionReceiptSha256, priorManifest?.bindings?.bPrimeRevision?.bindingSha256],
    [priorBindings.independentReviewReceiptSha256, priorManifest?.bindings?.independentReview?.bindingSha256],
  ];
  for (const [declared, authoritative] of priorReceiptPairs) {
    compareBinding(
      issues,
      declared,
      authoritative,
      "$.remediation.priorReceiptBindings",
      "REMEDIATION_PRIOR_RECEIPT_REFERENCE_MISMATCH",
    );
  }
  if (priorManifest?.c0Required === true) {
    for (const role of C0_ROLES) {
      compareBinding(
        issues,
        priorC0Bindings[role],
        priorManifestC0[role]?.bindingSha256,
        "$.remediation.priorReceiptBindings.c0RoleReceipts",
        "REMEDIATION_PRIOR_RECEIPT_REFERENCE_MISMATCH",
      );
    }
  } else if (Object.keys(priorC0Bindings).length !== 0) {
    addIssue(issues, "REMEDIATION_PRIOR_C0_BINDINGS_UNEXPECTED", "$.remediation.priorReceiptBindings.c0RoleReceipts");
  }
  const priorReceipts = manifestActiveHashes(priorManifest);
  const priorSet = new Set(priorReceipts);
  const invalidatedSet = new Set(invalidated);
  if (priorSet.size !== priorReceipts.length) {
    addIssue(issues, "REMEDIATION_PRIOR_RECEIPTS_NOT_DISTINCT", "$.remediation.priorReceiptBindings");
  }
  if (
    priorSet.size !== invalidatedSet.size ||
    [...priorSet].some((hash) => !invalidatedSet.has(hash)) ||
    [...invalidatedSet].some((hash) => !priorSet.has(hash))
  ) {
    addIssue(issues, "REMEDIATION_INVALIDATION_SET_MISMATCH", "$.remediation.invalidatedReceiptHashes");
  }
  const validationReceiptBody = remediation.validationReceiptBody;
  if (isObject(validationReceiptBody)) {
    compareBinding(
      issues,
      remediation.validationReceiptSha256,
      computeDPrimeValidationReceiptSha256(validationReceiptBody),
      "$.remediation.validationReceiptSha256",
      "REMEDIATION_VALIDATION_RECEIPT_DIGEST_MISMATCH",
    );
    if (!deepEqual(validationReceiptBody.priorCandidate, prior)) {
      addIssue(
        issues,
        "REMEDIATION_VALIDATION_RECEIPT_PRIOR_CANDIDATE_MISMATCH",
        "$.remediation.validationReceiptBody.priorCandidate",
      );
    }
    if (!deepEqual(validationReceiptBody.newCandidate, next)) {
      addIssue(
        issues,
        "REMEDIATION_VALIDATION_RECEIPT_NEW_CANDIDATE_MISMATCH",
        "$.remediation.validationReceiptBody.newCandidate",
      );
    }
    compareBinding(
      issues,
      validationReceiptBody.priorActiveReceiptManifestSha256,
      priorManifest?.manifestSha256,
      "$.remediation.validationReceiptBody.priorActiveReceiptManifestSha256",
      "REMEDIATION_VALIDATION_RECEIPT_MANIFEST_MISMATCH",
    );
    compareBinding(
      issues,
      validationReceiptBody.currentActiveReceiptManifestSha256,
      packet.activeReceiptManifest?.manifestSha256,
      "$.remediation.validationReceiptBody.currentActiveReceiptManifestSha256",
      "REMEDIATION_VALIDATION_RECEIPT_MANIFEST_MISMATCH",
    );
    compareBinding(
      issues,
      validationReceiptBody.invalidatedReceiptSetSha256,
      computeReceiptSetSha256(D_PRIME_INVALIDATED_SET_DOMAIN, invalidated),
      "$.remediation.validationReceiptBody.invalidatedReceiptSetSha256",
      "REMEDIATION_VALIDATION_RECEIPT_SET_MISMATCH",
    );
    compareBinding(
      issues,
      validationReceiptBody.currentActiveReceiptSetSha256,
      computeReceiptSetSha256(
        D_PRIME_CURRENT_SET_DOMAIN,
        manifestActiveHashes(packet.activeReceiptManifest),
      ),
      "$.remediation.validationReceiptBody.currentActiveReceiptSetSha256",
      "REMEDIATION_VALIDATION_RECEIPT_SET_MISMATCH",
    );
    compareBinding(
      issues,
      validationReceiptBody.deterministicReceiptSha256,
      packet.deterministic?.receiptSha256,
      "$.remediation.validationReceiptBody.deterministicReceiptSha256",
      "REMEDIATION_VALIDATION_RECEIPT_BINDING_MISMATCH",
    );
    const expectedBPrime = {
      critiqueReceiptSha256: packet.bPrime?.critiqueReceiptSha256,
      revisionReceiptSha256: packet.bPrime?.revisionReceiptSha256,
      revisionPredecessorReceiptSha256:
        packet.bPrime?.revisionPredecessorReceiptSha256,
      critiqueThenRevision: true,
      freshContext: true,
    };
    if (!deepEqual(validationReceiptBody.bPrime, expectedBPrime)) {
      addIssue(
        issues,
        "REMEDIATION_VALIDATION_RECEIPT_B_PRIME_MISMATCH",
        "$.remediation.validationReceiptBody.bPrime",
      );
    }
    const expectedC0 = {
      required: packet.c0Prime?.required === true,
      status: packet.c0Prime?.required === true ? "complete" : "not-required",
      roleReceipts: packet.c0Prime?.required === true
        ? Object.fromEntries(C0_ROLES.map((role) => [
          role,
          packet.c0Prime?.roles?.[role]?.receiptSha256,
        ]))
        : {},
    };
    if (!deepEqual(validationReceiptBody.c0Prime, expectedC0)) {
      addIssue(
        issues,
        "REMEDIATION_VALIDATION_RECEIPT_C0_MISMATCH",
        "$.remediation.validationReceiptBody.c0Prime",
      );
    }
    compareBinding(
      issues,
      validationReceiptBody.independentReviewReceiptSha256,
      packet.independentReviewState?.reviewReceiptSha256,
      "$.remediation.validationReceiptBody.independentReviewReceiptSha256",
      "REMEDIATION_VALIDATION_RECEIPT_BINDING_MISMATCH",
    );
    if (validationReceiptBody.freshContext !== true) {
      addIssue(
        issues,
        "REMEDIATION_VALIDATION_RECEIPT_NOT_FRESH",
        "$.remediation.validationReceiptBody.freshContext",
      );
    }
    if (!deepEqual(validationReceiptBody.redaction, {
      protectedContentIncluded: false,
      credentialsIncluded: false,
      rawProviderResponsesIncluded: false,
    })) {
      addIssue(
        issues,
        "REMEDIATION_VALIDATION_RECEIPT_REDACTION_MISMATCH",
        "$.remediation.validationReceiptBody.redaction",
      );
    }
  }
  const newReceipts = [
    bindings.deterministicReceiptSha256,
    bindings.bPrimeCritiqueReceiptSha256,
    bindings.bPrimeRevisionReceiptSha256,
    ...Object.values(c0Bindings),
    bindings.independentReviewReceiptSha256,
    bindings.dPrimeValidationReceiptSha256,
  ].filter((hash) => HASH_RE.test(hash ?? ""));
  if (remediation.freshContext !== true) {
    addIssue(issues, "REMEDIATION_NOT_FRESH", "$.remediation.freshContext");
  }
  compareBinding(
    issues,
    remediation.validationReceiptSha256,
    bindings.dPrimeValidationReceiptSha256,
    "$.remediation.validationReceiptSha256",
    "REMEDIATION_VALIDATION_RECEIPT_MISMATCH",
  );
  const disjointValidationHashes = new Set([
    ...priorReceipts,
    ...activeReceiptHashes(packet),
    ...PROOF_BOUNDARIES.map((name) => packet.proofBoundaries?.[name]?.evidenceSha256),
    ...collectReservedDomainHashes(packet, { includeDPrimeValidation: false }),
  ].filter((hash) => HASH_RE.test(hash ?? "")));
  if (disjointValidationHashes.has(remediation.validationReceiptSha256)) {
    addIssue(
      issues,
      "REMEDIATION_VALIDATION_RECEIPT_REUSED",
      "$.remediation.validationReceiptSha256",
    );
    addIssue(
      issues,
      "REMEDIATION_VALIDATION_RECEIPT_DOMAIN_COLLISION",
      "$.remediation.validationReceiptSha256",
    );
  }
  if (newReceipts.some((hash) => priorSet.has(hash) || invalidatedSet.has(hash))) {
    addIssue(issues, "REMEDIATION_STALE_RECEIPT_REUSED", "$.remediation.newReceiptBindings");
  }
  if (currentHashReferences(packet).some((hash) => invalidatedSet.has(hash))) {
    addIssue(issues, "REMEDIATION_INVALIDATED_HASH_STILL_ACTIVE", "$.evidenceHashes");
  }
  if (new Set(newReceipts).size !== newReceipts.length) {
    addIssue(issues, "REMEDIATION_NEW_RECEIPTS_NOT_DISTINCT", "$.remediation.newReceiptBindings");
  }
  if (
    packet.independentReviewState?.status !== "passed" ||
    packet.independentReviewState?.freshContext !== true
  ) {
    addIssue(issues, "REMEDIATION_INDEPENDENT_REVIEW_NOT_PASSED", "$.independentReviewState");
  }
}

function appendHash(target, value) {
  if (HASH_RE.test(value ?? "")) target.push(value);
}

function appendIdentityHashes(target, identity) {
  if (!isObject(identity)) return;
  for (const field of [
    "candidateSha256",
    "manifestSha256",
    "codeManifestSha256",
    "promptManifestSha256",
    "projectionManifestSha256",
  ]) appendHash(target, identity[field]);
}

function currentHashReferences(packet, includeEvidenceHashes = true) {
  const hashes = [];
  appendIdentityHashes(hashes, packet.identity);
  if (Array.isArray(packet.sourceIdentity)) {
    for (const source of packet.sourceIdentity) appendHash(hashes, source?.sha256);
  }
  const manifest = packet.activeReceiptManifest;
  appendHash(hashes, manifest?.controlPlaneSha256);
  appendHash(hashes, manifest?.manifestSha256);
  appendIdentityHashes(hashes, manifest?.controlPlane);
  for (const [, binding] of manifestBindingEntries(manifest)) {
    appendHash(hashes, binding?.resultBody?.outputDigestSha256);
    appendHash(hashes, binding?.resultBody?.validationProjection?.validationReceiptSha256);
    appendHash(hashes, binding?.resultBody?.validationProjectionSha256);
    appendHash(hashes, binding?.resultSha256);
    appendHash(hashes, binding?.artifactSha256);
    appendHash(hashes, binding?.controlPlaneSha256);
    appendHash(hashes, binding?.bindingSha256);
  }
  for (const hash of activeReceiptHashes(packet)) appendHash(hashes, hash);
  for (const name of PROOF_BOUNDARIES) {
    if (packet.proofBoundaries?.[name]?.status === "passed") {
      appendHash(hashes, packet.proofBoundaries[name].evidenceSha256);
    }
  }
  if (Array.isArray(packet.checks)) {
    for (const check of packet.checks) {
      if (typeof check?.evidenceRef === "string" && check.evidenceRef.startsWith("sha256:")) {
        appendHash(hashes, check.evidenceRef.slice("sha256:".length));
      }
    }
  }
  const authorization = packet.authorization;
  if (authorization?.liveProviderUsed === true) {
    for (const field of ["authorizationSha256", "candidateSha256", "codeManifestSha256", "runnerSha256"]) {
      appendHash(hashes, authorization[field]);
    }
    const projection = authorization.authorizationProjection;
    appendIdentityHashes(hashes, projection);
    appendHash(hashes, projection?.runnerSha256);
    const trust = authorization.authorizationTrustAnchor;
    for (const field of [
      "sourceIdentitySha256",
      "externalReceiptSha256",
      "boundReceiptSha256",
      "receiptIdentitySha256",
    ]) appendHash(hashes, trust?.[field]);
    for (const file of packet.executableCodeManifest?.files ?? []) {
      appendHash(hashes, file?.sha256);
    }
  }
  if (isObject(packet.liveExecution)) {
    for (const field of [
      "codeManifestSha256",
      "runnerSha256",
      "promptManifestSha256",
      "projectionManifestSha256",
    ]) {
      appendHash(hashes, packet.liveExecution[field]);
    }
  }
  if (packet.remediation?.candidateMutated === true && isObject(packet.remediation.newReceiptBindings)) {
    const bindings = packet.remediation.newReceiptBindings;
    appendHash(hashes, packet.remediation.validationReceiptSha256);
    appendHash(
      hashes,
      packet.remediation.validationReceiptBody?.invalidatedReceiptSetSha256,
    );
    appendHash(
      hashes,
      packet.remediation.validationReceiptBody?.currentActiveReceiptSetSha256,
    );
    appendIdentityHashes(hashes, bindings);
    appendHash(hashes, bindings.activeReceiptManifestSha256);
    for (const field of [
      "deterministicReceiptSha256",
      "bPrimeCritiqueReceiptSha256",
      "bPrimeRevisionReceiptSha256",
      "independentReviewReceiptSha256",
      "dPrimeValidationReceiptSha256",
    ]) appendHash(hashes, bindings[field]);
    if (isObject(bindings.c0RoleReceipts)) {
      for (const value of Object.values(bindings.c0RoleReceipts)) appendHash(hashes, value);
    }
    const priorBindings = packet.remediation.priorReceiptBindings;
    appendHash(hashes, priorBindings?.priorEnvelopeSha256);
    appendHash(hashes, priorBindings?.activeReceiptManifestSha256);
    const trust = priorBindings?.priorTrustAnchor;
    for (const field of [
      "sourceIdentitySha256",
      "externalReceiptSha256",
      "boundReceiptSha256",
      "receiptIdentitySha256",
    ]) appendHash(hashes, trust?.[field]);
  }
  if (includeEvidenceHashes && Array.isArray(packet.evidenceHashes)) {
    for (const hash of packet.evidenceHashes) appendHash(hashes, hash);
  }
  return [...new Set(hashes)];
}

function validateEvidenceHashCoverage(packet, issues) {
  if (!Array.isArray(packet.evidenceHashes)) return;
  const required = currentHashReferences(packet, false);
  if (required.some((hash) => !packet.evidenceHashes.includes(hash))) {
    addIssue(issues, "EVIDENCE_HASH_COVERAGE_INCOMPLETE", "$.evidenceHashes");
  }
  for (const check of packet.checks ?? []) {
    if (typeof check?.evidenceRef !== "string" || !check.evidenceRef.startsWith("sha256:")) continue;
    const hash = check.evidenceRef.slice("sha256:".length);
    if (!packet.evidenceHashes.includes(hash)) {
      addIssue(issues, "CHECK_EVIDENCE_HASH_UNCOVERED", "$.checks.evidenceRef");
    }
  }
}

export function validateMachineQaPacket(packet, options = {}) {
  const nowMs = options.nowMs ?? Date.now();
  const issues = [];
  pushUnsafeIssues(packet, issues);
  validateNoEmptySha256(packet, issues);
  validateSchemaNode(packet, SCHEMA, "$", issues);
  if (!isObject(packet)) return normalizeIssues(issues);
  validateCompleteState(packet, issues);
  validateRepositoryIdentity(packet, issues);
  validateStringGrammars(packet, issues);
  validateAuthority(packet, issues, nowMs);
  validateCurrentnessAndIndependentReview(packet, issues, nowMs);
  validateProofBoundaries(packet, issues);
  validateC0(packet, issues);
  validateCurrentActiveReceiptManifest(packet, issues);
  validateGlobalEvidenceIndependence(packet, issues);
  validateLiveAuthorization(packet, issues, nowMs, options.runtimeEvidence);
  validateRemediation(packet, issues, nowMs);
  validateEvidenceHashCoverage(packet, issues);
  return normalizeIssues(issues);
}

export function validatePacketSchema(packet) {
  const issues = [];
  validateSchemaNode(packet, SCHEMA, "$", issues);
  return normalizeIssues(issues);
}

function normalizeIssues(issues) {
  const unique = new Map();
  for (const item of issues) unique.set(`${item.code}:${item.path}`, item);
  return [...unique.values()].sort((a, b) => `${a.code}:${a.path}`.localeCompare(`${b.code}:${b.path}`));
}

function runGit(cwd, args, encoding = "utf8") {
  const result = spawnSync("git", args, { cwd, encoding, maxBuffer: 5 * 1024 * 1024 });
  if (result.status !== 0) return null;
  return result.stdout;
}

function isPathInside(root, candidate) {
  return candidate === root || candidate.startsWith(`${root}${sep}`);
}

function toRepositoryPath(root, absolutePath) {
  const value = relative(root, absolutePath).split(sep).join("/");
  if (!value || value === "." || value.startsWith("../") || value.includes("\\")) {
    return null;
  }
  return value;
}

function parseStaticEsmSpecifiers(source) {
  const helper = [
    'import vm from "node:vm";',
    'let source = "";',
    'process.stdin.setEncoding("utf8");',
    'for await (const chunk of process.stdin) source += chunk;',
    'try {',
    '  const module = new vm.SourceTextModule(source);',
    '  process.stdout.write(JSON.stringify(module.dependencySpecifiers));',
    '} catch { process.exitCode = 2; }',
  ].join("\n");
  const result = spawnSync(
    process.execPath,
    ["--no-warnings", "--experimental-vm-modules", "--input-type=module", "-e", helper],
    { input: source, encoding: "utf8", maxBuffer: 1024 * 1024 },
  );
  if (result.status !== 0) return null;
  try {
    const parsed = JSON.parse(result.stdout);
    return Array.isArray(parsed) && parsed.every((value) => typeof value === "string")
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function parseLiteralRequireSpecifiers(source) {
  const allCalls = [...source.matchAll(/\brequire\s*\(/g)];
  const literalCalls = [...source.matchAll(
    /\brequire\s*\(\s*(["'])([^"'\r\n]+)\1\s*\)/g,
  )];
  if (allCalls.length !== literalCalls.length) return null;
  return literalCalls.map((match) => match[2]);
}

function sourceHasUnsupportedDynamicBehavior(source) {
  return (
    /\bimport\s*(?:\/\*[\s\S]*?\*\/\s*)?\(/.test(source) ||
    /\b(?:createRequire|registerHooks|register)\s*\(/.test(source) ||
    /\b(?:eval|Function)\s*\(/.test(source) ||
    /--loader\b/.test(source)
  );
}

const BUILTIN_MODULE_SPECIFIERS = new Set([
  ...builtinModules,
  ...builtinModules.map((name) => name.startsWith("node:") ? name : `node:${name}`),
]);

function deriveExecutableClosure(root, manifest, fileBytes) {
  if (!isObject(manifest) || !Array.isArray(manifest.files)) return null;
  const declared = new Map(manifest.files.map((file) => [file?.path, file]));
  const closure = new Set();
  const pending = [manifest.entrypoint];
  while (pending.length > 0) {
    const current = pending.pop();
    if (closure.has(current)) continue;
    const descriptor = declared.get(current);
    const bytes = fileBytes.get(current);
    if (!descriptor || !Buffer.isBuffer(bytes)) return null;
    closure.add(current);
    const extension = extname(current);
    if (extension === ".json") continue;
    if (![".mjs", ".cjs", ".js"].includes(extension)) return null;
    const source = bytes.toString("utf8");
    if (sourceHasUnsupportedDynamicBehavior(source)) return null;
    const esm = parseStaticEsmSpecifiers(source);
    const requires = parseLiteralRequireSpecifiers(source);
    if (!Array.isArray(esm) || !Array.isArray(requires)) return null;
    for (const specifier of [...esm, ...requires]) {
      if (BUILTIN_MODULE_SPECIFIERS.has(specifier)) continue;
      if (!specifier.startsWith("./") && !specifier.startsWith("../")) return null;
      if (specifier.includes("?") || specifier.includes("#") || extname(specifier) === "") {
        return null;
      }
      const absolute = resolve(root, dirname(current), specifier);
      if (!isPathInside(root, absolute)) return null;
      const repositoryPath = toRepositoryPath(root, absolute);
      if (!repositoryPath || !declared.has(repositoryPath)) return null;
      pending.push(repositoryPath);
    }
  }
  if (manifest.resolutionPolicy === "standalone-bundle-v1" && closure.size !== 1) {
    return null;
  }
  const supportPaths = manifest.files
    .filter((file) => ["package-manifest", "dependency-lock"].includes(file?.kind))
    .map((file) => file.path);
  const expected = [...new Set([...closure, ...supportPaths])].sort();
  const actual = manifest.files.map((file) => file?.path).sort();
  if (!deepEqual(expected, actual)) return null;
  for (const file of manifest.files) {
    const expectedKind = file.path === manifest.entrypoint
      ? "entrypoint"
      : closure.has(file.path)
        ? "local-module"
        : file.path === "package.json"
          ? "package-manifest"
          : "dependency-lock";
    if (file.kind !== expectedKind) return null;
  }
  return closure;
}

function inspectExecutableCodeManifest(root, head, manifest) {
  if (!isObject(manifest) || !Array.isArray(manifest.files)) {
    return { current: false, closureValid: false };
  }
  const rootReal = realpathSync(root);
  const fileBytes = new Map();
  let current = true;
  for (const file of manifest.files) {
    if (
      !isObject(file) ||
      typeof file.path !== "string" ||
      !EXECUTABLE_PATH_RE.test(file.path) ||
      isAbsolute(file.path) ||
      file.path.includes("\\") ||
      file.path.split("/").includes("..")
    ) {
      current = false;
      continue;
    }
    const absolute = resolve(root, file.path);
    try {
      const metadata = lstatSync(absolute);
      const real = realpathSync(absolute);
      if (metadata.isSymbolicLink() || !metadata.isFile() || !isPathInside(rootReal, real)) {
        current = false;
        continue;
      }
      const workingBytes = readFileSync(absolute);
      const trackedBytes = runGit(root, ["show", `${head}:${file.path}`], null);
      const treeEntry = runGit(root, ["ls-tree", head, "--", file.path]);
      if (!Buffer.isBuffer(trackedBytes) || typeof treeEntry !== "string") {
        current = false;
        continue;
      }
      const mode = treeEntry.trim().split(/\s+/, 1)[0] ?? "";
      const workingHash = createHash("sha256").update(workingBytes).digest("hex");
      const trackedHash = createHash("sha256").update(trackedBytes).digest("hex");
      const workingExecutable = (metadata.mode & 0o111) !== 0;
      if (
        !["100644", "100755"].includes(mode) ||
        mode !== file.mode ||
        workingHash !== file.sha256 ||
        trackedHash !== file.sha256 ||
        workingExecutable !== (file.mode === "100755")
      ) {
        current = false;
      }
      fileBytes.set(file.path, workingBytes);
    } catch {
      current = false;
    }
  }
  const closure = deriveExecutableClosure(root, manifest, fileBytes);
  return { current, closureValid: closure instanceof Set };
}

export async function collectLiveRuntimeEvidence(packetPath, packet) {
  if (packet?.authorization?.liveProviderUsed !== true) return null;
  const starts = [dirname(resolve(packetPath)), process.cwd()];
  let root = null;
  for (const start of [...new Set(starts)]) {
    const rootOutput = runGit(start, ["rev-parse", "--show-toplevel"]);
    if (typeof rootOutput !== "string") continue;
    const candidateRoot = rootOutput.trim();
    const candidateHead = runGit(candidateRoot, ["rev-parse", "HEAD"]);
    if (
      typeof candidateHead === "string" &&
      candidateHead.trim() === packet.repository?.head
    ) {
      root = candidateRoot;
      break;
    }
  }
  if (root === null) return { available: false };
  const headOutput = runGit(root, ["rev-parse", "HEAD"]);
  const branchOutput = runGit(root, ["rev-parse", "--abbrev-ref", "HEAD"]);
  const statusOutput = runGit(root, ["status", "--porcelain=v1", "--untracked-files=all"]);
  if (
    typeof headOutput !== "string" ||
    typeof branchOutput !== "string" ||
    typeof statusOutput !== "string"
  ) {
    return { available: false };
  }
  let packetRepositoryPath = null;
  let packetOutsideRepository = false;
  try {
    const rootReal = realpathSync(root);
    const packetReal = realpathSync(resolve(packetPath));
    packetOutsideRepository = !isPathInside(rootReal, packetReal);
    if (!packetOutsideRepository) {
      packetRepositoryPath = toRepositoryPath(rootReal, packetReal);
    }
  } catch {
    packetRepositoryPath = null;
  }
  const packetInputQuarantined = packetOutsideRepository ||
    (packetRepositoryPath !== null &&
      runGit(root, ["check-ignore", "--quiet", "--", packetRepositoryPath]) !== null);
  const runnerPath = packet?.liveExecution?.runnerPath;
  if (
    typeof runnerPath !== "string" ||
    !RUNNER_PATH_RE.test(runnerPath) ||
    isAbsolute(runnerPath) ||
    runnerPath.split(/[\\/]/).includes("..") ||
    runnerPath.includes("\\")
  ) {
    return { available: false };
  }
  const absoluteRunner = resolve(root, runnerPath);
  if (absoluteRunner !== root && !absoluteRunner.startsWith(`${root}${sep}`)) return { available: false };
  let currentBytes;
  let currentStat;
  try {
    [currentBytes, currentStat] = await Promise.all([
      new Promise((resolvePromise, rejectPromise) => {
        readFile(absoluteRunner, (error, data) => (error ? rejectPromise(error) : resolvePromise(data)));
      }),
      new Promise((resolvePromise, rejectPromise) => {
        stat(absoluteRunner, (error, value) => (error ? rejectPromise(error) : resolvePromise(value)));
      }),
    ]);
  } catch {
    return { available: false };
  }
  const trackedBytes = runGit(root, ["show", `${packet.repository?.head}:${runnerPath}`], null);
  const treeEntry = runGit(root, ["ls-tree", packet.repository?.head, "--", runnerPath]);
  if (!Buffer.isBuffer(trackedBytes) || typeof treeEntry !== "string") return { available: false };
  const trackedRunnerMode = treeEntry.trim().split(/\s+/, 1)[0] ?? "";
  const manifest = packet?.executableCodeManifest;
  const manifestInspection = inspectExecutableCodeManifest(
    root,
    headOutput.trim(),
    manifest,
  );
  return {
    available: true,
    repositoryHead: headOutput.trim(),
    repositoryBranch: branchOutput.trim(),
    repositoryClean: statusOutput.trim().length === 0,
    packetInputQuarantined,
    codeManifestSha256: isObject(manifest)
      ? computeExecutableCodeManifestSha256(manifest)
      : null,
    codeManifestCurrent: manifestInspection.current,
    codeManifestClosureValid: manifestInspection.closureValid,
    runtimeVersion: process.version,
    runnerTracked: true,
    runnerSha256: createHash("sha256").update(currentBytes).digest("hex"),
    trackedRunnerSha256: createHash("sha256").update(trackedBytes).digest("hex"),
    runnerExecutable: (currentStat.mode & 0o111) !== 0,
    trackedRunnerExecutable: trackedRunnerMode === "100755",
    trackedRunnerMode,
  };
}

export function isSafeTimestamp(value, nowMs = Date.now()) {
  return isIsoTimestamp(value) && Date.parse(value) <= nowMs;
}

export function validateProofBoundaryObject(value) {
  const issues = [];
  validateSchemaNode(value, SCHEMA.$defs.proofBoundaries, "$.proofBoundaries", issues);
  if (isObject(value)) {
    const passedHashes = [];
    for (const name of PROOF_BOUNDARIES) {
      const boundary = value[name];
      if (boundary?.status === "passed" && !HASH_RE.test(boundary.evidenceSha256 ?? "")) {
        addIssue(issues, "PROOF_BOUNDARY_HASH_MISSING", `$.proofBoundaries.${name}.evidenceSha256`);
      } else if (boundary?.status === "passed") {
        passedHashes.push(boundary.evidenceSha256);
      }
      if (
        (boundary?.status === "unverified" || boundary?.status === "not-applicable") &&
        boundary.evidenceSha256 !== null
      ) {
        addIssue(issues, "PROOF_BOUNDARY_UNVERIFIED_HASH", `$.proofBoundaries.${name}.evidenceSha256`);
      }
    }
    if (new Set(passedHashes).size !== passedHashes.length) {
      addIssue(issues, "PROOF_BOUNDARY_HASH_REUSED", "$.proofBoundaries");
    }
  }
  return normalizeIssues(issues);
}

export function validateIndependentReviewObject(value, candidateSha256) {
  const issues = [];
  validateSchemaNode(value, SCHEMA.$defs.independentReviewState, "$.independentReviewState", issues);
  if (isObject(value) && value.status === "passed") {
    if (value.freshContext !== true) addIssue(issues, "INDEPENDENT_REVIEW_NOT_FRESH", "$.independentReviewState.freshContext");
    if (!HASH_RE.test(value.reviewReceiptSha256 ?? "")) {
      addIssue(issues, "INDEPENDENT_REVIEW_RECEIPT_MISSING", "$.independentReviewState.reviewReceiptSha256");
    }
    if (!HASH_RE.test(candidateSha256 ?? "")) {
      addIssue(issues, "INDEPENDENT_REVIEW_CANDIDATE_MISSING", "$.independentReviewState.boundCandidateSha256");
    } else if (value.boundCandidateSha256 !== candidateSha256) {
      addIssue(issues, "INDEPENDENT_REVIEW_CANDIDATE_MISMATCH", "$.independentReviewState.boundCandidateSha256");
    }
  }
  return normalizeIssues(issues);
}

export function validateClaimCeilingObject(value) {
  const issues = [];
  validateSchemaNode(value, SCHEMA.$defs.claimCeiling, "$.claimCeiling", issues);
  return normalizeIssues(issues);
}

export function validateRedactionObject(value) {
  const issues = [];
  validateSchemaNode(value, SCHEMA.$defs.redaction, "$.redaction", issues);
  return normalizeIssues(issues);
}
