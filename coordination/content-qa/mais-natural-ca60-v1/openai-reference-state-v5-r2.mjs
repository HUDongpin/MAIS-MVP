const BASE_ROLES = Object.freeze(["A_SOLVE", "A_LABEL", "B_SOLVE", "B_LABEL"]);
const ADJUDICATOR = "ADJUDICATOR";
const RETRYABLE = new Set(["TIMEOUT", "HTTP_429", "HTTP_500", "MALFORMED_200", "SCHEMA_FAILURE"]);
const KNOWN = new Set(["SUCCEEDED", ...RETRYABLE]);

function add(errors, message) {
  if (!errors.includes(message)) errors.push(message);
}

export function planOpenAIReferenceResumeV5R2({ attempts, adjudicationRequired }) {
  const errors = [];
  if (!Array.isArray(attempts)) throw new TypeError("OpenAI reference attempts must be an array");
  if (![true, false, null].includes(adjudicationRequired)) throw new TypeError("adjudicationRequired must be true, false, or null");
  const allowedRoles = new Set([...BASE_ROLES, ADJUDICATOR]);
  const byRole = new Map([...allowedRoles].map((role) => [role, []]));
  const attemptIds = new Set();
  for (const [index, entry] of attempts.entries()) {
    if (!entry || typeof entry !== "object" || typeof entry.role !== "string"
      || typeof entry.attemptId !== "string" || entry.attemptId.length === 0) {
      add(errors, `attempt ${index + 1} shape is invalid`);
      continue;
    }
    if (!allowedRoles.has(entry.role)) {
      add(errors, `attempt ${index + 1} role is outside the frozen OpenAI panel`);
      continue;
    }
    if (attemptIds.has(entry.attemptId)) add(errors, `attempt ${index + 1} duplicates attemptId`);
    attemptIds.add(entry.attemptId);
    if (!KNOWN.has(entry.attemptStatus)) add(errors, `attempt ${index + 1} status is not frozen`);
    byRole.get(entry.role).push(entry);
  }
  if (byRole.get(ADJUDICATOR).length > 0 && adjudicationRequired !== true) {
    add(errors, "adjudicator was attempted before a frozen adjudication-required decision");
  }

  const requiredRoles = adjudicationRequired === true ? [...BASE_ROLES, ADJUDICATOR] : [...BASE_ROLES];
  const completedRoles = [];
  const pendingRoles = [];
  const blockedRoles = [];
  for (const role of requiredRoles) {
    const roleAttempts = byRole.get(role);
    const successes = roleAttempts.filter((entry) => entry.attemptStatus === "SUCCEEDED");
    if (roleAttempts.length > 2 || successes.length > 1) {
      add(errors, `${role} violates the two-attempt or one-success rule`);
      blockedRoles.push(role);
      continue;
    }
    if (successes.length === 1 && roleAttempts.at(-1)?.attemptStatus !== "SUCCEEDED") {
      add(errors, `${role} has an attempt after successful completion`);
      blockedRoles.push(role);
      continue;
    }
    if (successes.length === 1) {
      completedRoles.push(role);
      continue;
    }
    if (roleAttempts.length === 2) {
      add(errors, `${role} reached the two-attempt cap without success`);
      blockedRoles.push(role);
      continue;
    }
    if (roleAttempts.length === 0 || RETRYABLE.has(roleAttempts.at(-1).attemptStatus)) pendingRoles.push(role);
    else {
      add(errors, `${role} has a non-retryable incomplete state`);
      blockedRoles.push(role);
    }
  }

  const dependencies = {
    A_SOLVE: [],
    A_LABEL: ["A_SOLVE"],
    B_SOLVE: [],
    B_LABEL: ["B_SOLVE"],
    ADJUDICATOR: [...BASE_ROLES],
  };
  const completed = new Set(completedRoles);
  const baseComplete = BASE_ROLES.every((role) => completed.has(role));
  const adjudicationDecisionPending = adjudicationRequired === null && baseComplete;
  if (byRole.get(ADJUDICATOR).length > 0 && !baseComplete) {
    add(errors, "adjudicator was attempted before all four base roles completed");
  }
  const nextRole = errors.length === 0
    ? requiredRoles.find((role) => pendingRoles.includes(role)
      && dependencies[role].every((dependency) => completed.has(dependency))) ?? null
    : null;
  const complete = errors.length === 0
    && baseComplete
    && (adjudicationRequired === false || (adjudicationRequired === true && completed.has(ADJUDICATOR)));

  return Object.freeze({
    schemaVersion: "OpenAIReferenceResumePlanV1",
    valid: errors.length === 0,
    complete,
    adjudicationDecisionPending,
    completedRoles: Object.freeze(completedRoles),
    pendingRoles: Object.freeze(pendingRoles),
    blockedRoles: Object.freeze(blockedRoles),
    nextRole,
    errors: Object.freeze(errors),
  });
}

export const OPENAI_REFERENCE_STATE_V5_R2_CONSTANTS = Object.freeze({
  baseRoles: BASE_ROLES,
  adjudicatorRole: ADJUDICATOR,
  maximumAttemptsPerRole: 2,
});
