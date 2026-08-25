import {
  canonicalJson,
} from "../../research/mais-natural-ca60-v1/versions/design-v4/design-contract.mjs";

const DESIGN_ID = "MAIS-NATURAL-CA60-V4";
const SHA256 = /^[0-9a-f]{64}$/u;
const SAMPLE_PSEUDONYM = /^ca60-[0-9a-f]{32}$/u;

const BASE_ROLES = Object.freeze([
  "B_PRIME_CRITIQUE",
  "B_PRIME_REVISION",
]);

const C0_ROLES = Object.freeze([
  "C0_PRIME_ROLE_1",
  "C0_PRIME_ROLE_2",
  "C0_PRIME_ROLE_3",
  "C0_PRIME_ROLE_4",
  "C0_PRIME_ROLE_5",
]);

const RETRYABLE_STATUSES = Object.freeze(new Set([
  "TRANSIENT_NETWORK_FAILURE",
  "TIMEOUT",
  "HTTP_429",
  "HTTP_500",
  "CONNECTION_LOST_AFTER_DISPATCH",
  "MALFORMED_200",
  "SCHEMA_FAILURE",
]));

const KNOWN_STATUSES = Object.freeze(new Set([
  "SUCCESS",
  ...RETRYABLE_STATUSES,
  "CAP_BLOCKED_BEFORE_REQUEST",
]));

const EXECUTION_LEAF_FIELDS = Object.freeze([
  "registrationHash",
  "frameRegistrationHash",
  "sampleManifestHash",
  "referenceSealHash",
  "executionRegistrationHash",
  "promptSetHash",
  "schemaSetHash",
  "runnerHash",
  "adapterHash",
  "provider",
  "model",
  "endpoint",
]);

function plainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function same(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

function add(errors, message) {
  if (!errors.includes(message)) errors.push(message);
}

export function deepSeekRoleOrderV1({ c0Required }) {
  if (typeof c0Required !== "boolean") throw new TypeError("c0Required must be boolean");
  return Object.freeze(c0Required ? [...BASE_ROLES, ...C0_ROLES] : [...BASE_ROLES]);
}

function validManifestRow(row) {
  return plainObject(row)
    && typeof row.itemId === "string" && row.itemId.length > 0
    && SHA256.test(row.itemHash ?? "")
    && typeof row.clusterId === "string" && row.clusterId.length > 0
    && SAMPLE_PSEUDONYM.test(row.itemIdPseudonym ?? "");
}

export function selectRegisteredCanaryV1(sampleManifest) {
  if (!plainObject(sampleManifest)
    || sampleManifest.designId !== DESIGN_ID
    || !Array.isArray(sampleManifest.selectedRows)
    || sampleManifest.selectedRows.length !== 60
    || sampleManifest.selectedRows.some((row) => !validManifestRow(row))) {
    throw new TypeError("registered canary requires a complete 60-row V4 sample manifest");
  }
  const clusters = sampleManifest.selectedRows.map((row) => row.clusterId);
  if (new Set(clusters).size !== 60) throw new TypeError("registered sample contains repeated clusters");
  const first = sampleManifest.selectedRows[0];
  return Object.freeze({
    ...structuredClone(first),
    manifestOrdinal: 1,
    formalSampleMember: true,
    sampleSize: 60,
  });
}

function allowedRequiredRoleSet(requiredRoles) {
  return same(requiredRoles, BASE_ROLES) || same(requiredRoles, [...BASE_ROLES, ...C0_ROLES]);
}

export function planItemResumeV1({ requiredRoles, attempts }) {
  const errors = [];
  if (!Array.isArray(requiredRoles) || !allowedRequiredRoleSet(requiredRoles)) {
    return Object.freeze({
      schemaVersion: "ItemResumePlanV1",
      valid: false,
      complete: false,
      completedRoles: Object.freeze([]),
      pendingRoles: Object.freeze([]),
      blockedRoles: Object.freeze([]),
      errors: Object.freeze(["required role order differs from the frozen DeepSeek role graph"]),
    });
  }
  if (!Array.isArray(attempts)) {
    return Object.freeze({
      schemaVersion: "ItemResumePlanV1",
      valid: false,
      complete: false,
      completedRoles: Object.freeze([]),
      pendingRoles: Object.freeze([]),
      blockedRoles: Object.freeze([]),
      errors: Object.freeze(["attempt list is invalid"]),
    });
  }

  const byRole = new Map(requiredRoles.map((role) => [role, []]));
  const attemptIds = new Set();
  for (const [index, attempt] of attempts.entries()) {
    if (!plainObject(attempt) || typeof attempt.role !== "string" || typeof attempt.attemptId !== "string" || attempt.attemptId.length === 0) {
      add(errors, `attempt ${index + 1} shape is invalid`);
      continue;
    }
    if (attemptIds.has(attempt.attemptId)) add(errors, `attempt ${index + 1} duplicates an attemptId`);
    attemptIds.add(attempt.attemptId);
    if (!byRole.has(attempt.role)) {
      add(errors, `attempt ${index + 1} uses an extra or sixth C0 role`);
      continue;
    }
    if (!KNOWN_STATUSES.has(attempt.attemptStatus)) add(errors, `attempt ${index + 1} status is not frozen`);
    byRole.get(attempt.role).push(attempt);
  }

  const completedRoles = [];
  const pendingRoles = [];
  const blockedRoles = [];
  for (const role of requiredRoles) {
    const roleAttempts = byRole.get(role);
    const successful = roleAttempts.filter((attempt) => attempt.attemptStatus === "SUCCESS");
    if (roleAttempts.length > 2) {
      add(errors, `${role} exceeds the two-attempt cap`);
      blockedRoles.push(role);
      continue;
    }
    if (successful.length > 1) {
      add(errors, `${role} contains duplicate successful execution`);
      blockedRoles.push(role);
      continue;
    }
    if (successful.length === 1) {
      completedRoles.push(role);
      continue;
    }
    if (roleAttempts.some((attempt) => attempt.attemptStatus === "CAP_BLOCKED_BEFORE_REQUEST")) {
      add(errors, `${role} is blocked by a pre-dispatch cap decision`);
      blockedRoles.push(role);
      continue;
    }
    if (roleAttempts.some((attempt) => !KNOWN_STATUSES.has(attempt.attemptStatus))) {
      blockedRoles.push(role);
      continue;
    }
    if (roleAttempts.length >= 2) {
      add(errors, `${role} reached the two-attempt cap without success`);
      blockedRoles.push(role);
      continue;
    }
    if (roleAttempts.length === 0 || RETRYABLE_STATUSES.has(roleAttempts.at(-1).attemptStatus)) {
      pendingRoles.push(role);
      continue;
    }
    add(errors, `${role} has a permanent non-success state`);
    blockedRoles.push(role);
  }

  const valid = errors.length === 0;
  return Object.freeze({
    schemaVersion: "ItemResumePlanV1",
    valid,
    complete: valid && completedRoles.length === requiredRoles.length,
    completedRoles: Object.freeze(completedRoles),
    pendingRoles: Object.freeze(pendingRoles),
    blockedRoles: Object.freeze(blockedRoles),
    errors: Object.freeze(errors),
  });
}

export function validateExecutionLeafBindingsV1({ frozen, observed }) {
  const errors = [];
  const driftFields = [];
  if (!plainObject(frozen) || !plainObject(observed)) {
    return Object.freeze({
      valid: false,
      decisionStatus: "INVALID_FOR_GENERALIZATION",
      driftFields: Object.freeze([]),
      errors: Object.freeze(["frozen and observed execution leaves are required"]),
    });
  }
  const frozenFields = Object.keys(frozen).sort();
  const observedFields = Object.keys(observed).sort();
  if (!same(frozenFields, [...EXECUTION_LEAF_FIELDS].sort())
    || !same(observedFields, [...EXECUTION_LEAF_FIELDS].sort())) {
    add(errors, "execution leaf object is not the frozen closed shape");
  }
  for (const field of EXECUTION_LEAF_FIELDS) {
    if (!Object.is(frozen[field], observed[field])) driftFields.push(field);
  }
  if (driftFields.length > 0) add(errors, `execution leaf drift: ${driftFields.join(",")}`);
  return Object.freeze({
    valid: errors.length === 0,
    decisionStatus: errors.length === 0 ? null : "INVALID_FOR_GENERALIZATION",
    driftFields: Object.freeze(driftFields),
    errors: Object.freeze(errors),
  });
}
