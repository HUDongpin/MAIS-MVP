const SHA256 = /^[0-9a-f]{64}$/u;
const BASE_ROLES = Object.freeze(["B_PRIME_CRITIQUE", "B_PRIME_REVISION"]);
const C0_ROLES = Object.freeze([
  "C0_PRIME_ROLE_1", "C0_PRIME_ROLE_2", "C0_PRIME_ROLE_3", "C0_PRIME_ROLE_4", "C0_PRIME_ROLE_5",
]);
const RETRYABLE = new Set([
  "TRANSIENT_NETWORK_FAILURE", "TIMEOUT", "HTTP_429", "HTTP_500",
  "CONNECTION_LOST_AFTER_DISPATCH", "MALFORMED_200", "SCHEMA_FAILURE",
]);
const KNOWN = new Set(["SUCCEEDED", ...RETRYABLE]);

function invalid(requiredRoles, errors, completedRoles = []) {
  return Object.freeze({
    schemaVersion: "DeepSeekItemResumePlanV5R2",
    valid: false,
    complete: false,
    requiredRoles: Object.freeze(requiredRoles),
    completedRoles: Object.freeze(completedRoles),
    nextRole: null,
    deferredRoles: Object.freeze([]),
    errors: Object.freeze([...new Set(errors)]),
  });
}

export function planDeepSeekItemResumeV5R2({ itemHash, itemIdPseudonym, c0Required, attempts } = {}) {
  const requiredRoles = c0Required === true ? [...BASE_ROLES, ...C0_ROLES] : [...BASE_ROLES];
  const errors = [];
  if (!SHA256.test(itemHash ?? "") || typeof itemIdPseudonym !== "string" || itemIdPseudonym.length === 0
    || typeof c0Required !== "boolean" || !Array.isArray(attempts)) {
    return invalid(requiredRoles, ["DeepSeek resume item identity, C0 decision, or attempts are invalid"]);
  }
  const byRole = new Map(requiredRoles.map((role) => [role, []]));
  const attemptIds = new Set();
  for (const [index, attempt] of attempts.entries()) {
    if (!attempt || typeof attempt !== "object" || typeof attempt.attemptId !== "string" || attempt.attemptId.length === 0
      || typeof attempt.role !== "string" || !KNOWN.has(attempt.attemptStatus)) {
      errors.push(`attempt ${index + 1} shape or status is invalid`);
      continue;
    }
    if (attemptIds.has(attempt.attemptId)) errors.push(`attempt ${index + 1} duplicates attemptId`);
    attemptIds.add(attempt.attemptId);
    if (attempt.itemHash !== itemHash || attempt.itemIdPseudonym !== itemIdPseudonym) {
      errors.push(`attempt ${index + 1} crosses the frozen item boundary`);
    }
    if (!byRole.has(attempt.role)) {
      errors.push(`attempt ${index + 1} uses an extra or sixth C0 role`);
      continue;
    }
    byRole.get(attempt.role).push(attempt);
  }
  const completedRoles = [];
  let firstIncompleteIndex = requiredRoles.length;
  for (const [index, role] of requiredRoles.entries()) {
    const roleAttempts = byRole.get(role);
    const successes = roleAttempts.filter((attempt) => attempt.attemptStatus === "SUCCEEDED");
    if (roleAttempts.length > 2) errors.push(`${role} exceeds the two-attempt cap`);
    if (successes.length > 1) errors.push(`${role} contains duplicate successful execution`);
    if (successes.length === 1 && roleAttempts.at(-1)?.attemptStatus !== "SUCCEEDED") {
      errors.push(`${role} has attempts after success`);
    }
    if (successes.length === 1) {
      completedRoles.push(role);
    } else if (firstIncompleteIndex === requiredRoles.length) {
      firstIncompleteIndex = index;
      if (roleAttempts.length >= 2) errors.push(`${role} reached the two-attempt cap without success`);
    }
  }
  if (firstIncompleteIndex < requiredRoles.length) {
    for (const role of requiredRoles.slice(firstIncompleteIndex + 1)) {
      if (byRole.get(role).length > 0) errors.push(`${role} was attempted before its dependency completed`);
    }
  }
  if (completedRoles.some((role, index) => role !== requiredRoles[index])) {
    errors.push("DeepSeek successful roles are not a contiguous dependency prefix");
  }
  if (errors.length > 0) return invalid(requiredRoles, errors, completedRoles);
  const complete = completedRoles.length === requiredRoles.length;
  const nextRole = complete ? null : requiredRoles[completedRoles.length];
  return Object.freeze({
    schemaVersion: "DeepSeekItemResumePlanV5R2",
    valid: true,
    complete,
    requiredRoles: Object.freeze(requiredRoles),
    completedRoles: Object.freeze(completedRoles),
    nextRole,
    deferredRoles: Object.freeze(complete ? [] : requiredRoles.slice(completedRoles.length + 1)),
    errors: Object.freeze([]),
  });
}

export const DEEPSEEK_EXECUTION_STATE_V5_R2_CONSTANTS = Object.freeze({
  baseRoles: BASE_ROLES,
  c0Roles: C0_ROLES,
  maximumAttemptsPerRole: 2,
});
