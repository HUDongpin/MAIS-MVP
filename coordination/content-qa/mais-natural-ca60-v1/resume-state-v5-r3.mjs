import {
  buildDeepSeekC0TriggerReceiptV1,
  buildOpenAIAdjudicationTriggerReceiptV1,
  validateSelfHashV5R3,
} from "./execution-integrity-v5-r3.mjs";

const OPENAI_BASE = Object.freeze(["A_SOLVE", "A_LABEL", "B_SOLVE", "B_LABEL"]);
const DEEPSEEK_BASE = Object.freeze(["B_PRIME_CRITIQUE", "B_PRIME_REVISION"]);
const C0_ROLES = Object.freeze(["C0_PRIME_ROLE_1", "C0_PRIME_ROLE_2", "C0_PRIME_ROLE_3", "C0_PRIME_ROLE_4", "C0_PRIME_ROLE_5"]);
const RETRYABLE = new Set([
  "TIMEOUT", "HTTP_429", "HTTP_500", "CONNECTION_LOST_AFTER_DISPATCH",
  "BODY_READ_FAILED_AFTER_DISPATCH", "MALFORMED_200", "SCHEMA_FAILURE",
]);
const KNOWN = new Set(["SUCCEEDED", ...RETRYABLE]);

function unique(errors) {
  return Object.freeze([...new Set(errors)]);
}

function validateAttempts({ attempts, item, allowedRoles, requiredRoles }) {
  const errors = [];
  const byRole = new Map(allowedRoles.map((role) => [role, []]));
  const attemptIds = new Set();
  if (!Array.isArray(attempts)) return { errors: ["attempt list is invalid"], byRole, completedRoles: [] };
  for (const [index, attempt] of attempts.entries()) {
    if (!validateSelfHashV5R3(attempt)) {
      errors.push(`attempt ${index + 1} self-hash is invalid`);
      continue;
    }
    if (attempt.itemHash !== item.itemHash || attempt.itemIdPseudonym !== item.itemIdPseudonym) errors.push(`attempt ${index + 1} crosses the item boundary`);
    if (!byRole.has(attempt.role)) {
      errors.push(`attempt ${index + 1} role is outside the frozen workflow`);
      continue;
    }
    if (!KNOWN.has(attempt.attemptStatus)) errors.push(`attempt ${index + 1} status is outside the frozen workflow`);
    if (attemptIds.has(attempt.attemptId)) errors.push(`attempt ${index + 1} has a duplicate attemptId`);
    attemptIds.add(attempt.attemptId);
    byRole.get(attempt.role).push(attempt);
  }
  const completedRoles = [];
  for (const role of requiredRoles) {
    const roleAttempts = byRole.get(role) ?? [];
    const successes = roleAttempts.filter((attempt) => attempt.attemptStatus === "SUCCEEDED");
    if (roleAttempts.length > 2) errors.push(`${role} exceeds the two-attempt cap`);
    if (successes.length > 1) errors.push(`${role} has duplicate successful attempts`);
    if (successes.length === 1 && roleAttempts.at(-1)?.attemptStatus !== "SUCCEEDED") errors.push(`${role} has an attempt after success`);
    if (successes.length === 1) completedRoles.push(role);
    else if (roleAttempts.length >= 2) errors.push(`${role} exhausted two attempts without success`);
  }
  const firstIncomplete = requiredRoles.findIndex((role) => !completedRoles.includes(role));
  if (firstIncomplete >= 0) {
    for (const role of requiredRoles.slice(firstIncomplete + 1)) {
      if ((byRole.get(role) ?? []).length > 0) errors.push(`${role} was attempted before its dependency completed`);
    }
  }
  if (completedRoles.some((role, index) => role !== requiredRoles[index])) errors.push("successful roles are not a contiguous dependency prefix");
  return { errors, byRole, completedRoles };
}

function verifyAdjudicationTrigger(item, trigger) {
  if (!trigger || typeof trigger !== "object" || !trigger.triggerReceipt || !trigger.labelA || !trigger.labelB) {
    return { errors: ["sealed adjudication trigger and source labels are required"], required: null };
  }
  try {
    const rebuilt = buildOpenAIAdjudicationTriggerReceiptV1({
      item,
      labelA: trigger.labelA,
      labelB: trigger.labelB,
      triggerEngineHash: trigger.triggerReceipt.triggerEngineHash,
    });
    if (!validateSelfHashV5R3(trigger.triggerReceipt) || rebuilt.selfHash !== trigger.triggerReceipt.selfHash) {
      return { errors: ["sealed adjudication trigger does not rebuild"], required: null };
    }
    return { errors: [], required: trigger.triggerReceipt.adjudicationRequired };
  } catch (error) {
    return { errors: [error instanceof Error ? error.message : "sealed adjudication trigger is invalid"], required: null };
  }
}

function verifyC0Trigger(item, trigger) {
  if (!trigger || typeof trigger !== "object" || !trigger.triggerReceipt
    || !trigger.randomAuditSelectionReceipt || !trigger.mandatoryTriggerReceipt) {
    return { errors: ["sealed C0 trigger and source receipts are required"], required: null };
  }
  try {
    const rebuilt = buildDeepSeekC0TriggerReceiptV1({
      item,
      randomAuditSelectionReceipt: trigger.randomAuditSelectionReceipt,
      mandatoryTriggerReceipt: trigger.mandatoryTriggerReceipt,
      triggerEngineHash: trigger.triggerReceipt.triggerEngineHash,
    });
    if (!validateSelfHashV5R3(trigger.triggerReceipt) || rebuilt.selfHash !== trigger.triggerReceipt.selfHash) {
      return { errors: ["sealed C0 trigger does not rebuild"], required: null };
    }
    return { errors: [], required: trigger.triggerReceipt.c0Required };
  } catch (error) {
    return { errors: [error instanceof Error ? error.message : "sealed C0 trigger is invalid"], required: null };
  }
}

function validItem(item) {
  return /^[0-9a-f]{64}$/u.test(item?.itemHash ?? "") && typeof item?.itemIdPseudonym === "string" && item.itemIdPseudonym.length > 0;
}

export function planOpenAIReferenceResumeV5R3({ item, attempts, adjudicationTrigger } = {}) {
  const errors = [];
  if (!validItem(item)) errors.push("OpenAI resume item identity is invalid");
  const baseCheck = validateAttempts({ attempts, item: item ?? {}, allowedRoles: [...OPENAI_BASE, "ADJUDICATOR"], requiredRoles: OPENAI_BASE });
  errors.push(...baseCheck.errors);
  const baseComplete = OPENAI_BASE.every((role) => baseCheck.completedRoles.includes(role));
  let adjudicationRequired = null;
  if (baseComplete) {
    const trigger = verifyAdjudicationTrigger(item, adjudicationTrigger);
    errors.push(...trigger.errors);
    adjudicationRequired = trigger.required;
  } else if (adjudicationTrigger !== null && adjudicationTrigger !== undefined) {
    errors.push("sealed adjudication trigger cannot precede all four base roles");
  }
  const requiredRoles = adjudicationRequired === true ? [...OPENAI_BASE, "ADJUDICATOR"] : [...OPENAI_BASE];
  const fullCheck = validateAttempts({ attempts, item: item ?? {}, allowedRoles: [...OPENAI_BASE, "ADJUDICATOR"], requiredRoles });
  errors.push(...fullCheck.errors);
  const nextRole = errors.length === 0 ? requiredRoles.find((role) => !fullCheck.completedRoles.includes(role)) ?? null : null;
  return Object.freeze({
    schemaVersion: "OpenAIReferenceResumePlanV5R3",
    valid: errors.length === 0,
    complete: errors.length === 0 && nextRole === null && adjudicationRequired !== null,
    adjudicationRequired,
    adjudicationTriggerReceiptHash: adjudicationTrigger?.triggerReceipt?.selfHash ?? null,
    requiredRoles: Object.freeze(requiredRoles),
    completedRoles: Object.freeze(fullCheck.completedRoles),
    nextRole,
    errors: unique(errors),
  });
}

export function planDeepSeekResumeV5R3({ item, attempts, c0Trigger } = {}) {
  const errors = [];
  if (!validItem(item)) errors.push("DeepSeek resume item identity is invalid");
  const baseCheck = validateAttempts({ attempts, item: item ?? {}, allowedRoles: [...DEEPSEEK_BASE, ...C0_ROLES], requiredRoles: DEEPSEEK_BASE });
  errors.push(...baseCheck.errors);
  const baseComplete = DEEPSEEK_BASE.every((role) => baseCheck.completedRoles.includes(role));
  let c0Required = null;
  if (baseComplete) {
    const trigger = verifyC0Trigger(item, c0Trigger);
    errors.push(...trigger.errors);
    c0Required = trigger.required;
  } else if (c0Trigger !== null && c0Trigger !== undefined) {
    errors.push("sealed C0 trigger cannot precede both base roles");
  }
  const requiredRoles = c0Required === true ? [...DEEPSEEK_BASE, ...C0_ROLES] : [...DEEPSEEK_BASE];
  const fullCheck = validateAttempts({ attempts, item: item ?? {}, allowedRoles: [...DEEPSEEK_BASE, ...C0_ROLES], requiredRoles });
  errors.push(...fullCheck.errors);
  const nextRole = errors.length === 0 ? requiredRoles.find((role) => !fullCheck.completedRoles.includes(role)) ?? null : null;
  return Object.freeze({
    schemaVersion: "DeepSeekResumePlanV5R3",
    valid: errors.length === 0,
    complete: errors.length === 0 && nextRole === null && c0Required !== null,
    c0Required,
    c0TriggerReceiptHash: c0Trigger?.triggerReceipt?.selfHash ?? null,
    requiredRoles: Object.freeze(requiredRoles),
    completedRoles: Object.freeze(fullCheck.completedRoles),
    nextRole,
    errors: unique(errors),
  });
}

export const V5_R3_RESUME_CONSTANTS = Object.freeze({
  openAIBaseRoles: OPENAI_BASE,
  deepSeekBaseRoles: DEEPSEEK_BASE,
  c0Roles: C0_ROLES,
  maximumAttemptsPerRole: 2,
});
