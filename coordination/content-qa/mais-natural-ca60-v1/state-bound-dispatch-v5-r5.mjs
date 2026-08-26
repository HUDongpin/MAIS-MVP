import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
  validateSelfHashV5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  assertClosedSelfHashedArtifactV5R5,
  validateClosedSelfHashedArtifactV5R5,
} from "./schema-contract-v5-r5.mjs";
import {
  validateDeepSeekExecutionRegistrationV5R5,
} from "./deepseek-execution-registration-v5-r5.mjs";
import {
  validateExecutionLedgerEntriesV5R4,
} from "./atomic-execution-ledger-v5-r4.mjs";
import {
  planOpenAIReferenceResumeV5R4,
} from "./execution-state-v5-r4.mjs";
import {
  validateManifestBoundInventoryV5R5,
} from "./execution-evidence-v5-r5.mjs";
import {
  validateAuthenticatedRouteEvidenceV5R5,
} from "./route-authorization-v5-r5.mjs";
import {
  validateC0PredicateReceiptV5R5,
  validateDeepSeekC0ExecutionSetV5R5,
} from "./c0-trigger-v5-r5.mjs";
import {
  validateProviderActivationV5R5,
} from "./activation-guard-v5-r5.mjs";

const DEEPSEEK_BASE_ROLES = Object.freeze(["B_PRIME_CRITIQUE", "B_PRIME_REVISION"]);
const C0_ROLES = Object.freeze(["C0_PRIME_ROLE_1", "C0_PRIME_ROLE_2", "C0_PRIME_ROLE_3", "C0_PRIME_ROLE_4", "C0_PRIME_ROLE_5"]);

function add(errors, condition, message) { if (!condition && !errors.includes(message)) errors.push(message); }
function hash(value) { return typeof value === "string" && /^[0-9a-f]{64}$/u.test(value); }
function requireCondition(condition, message) { if (!condition) throw new TypeError(message); }

function roleState(entries, itemHash, role) {
  const reservations = (entries ?? []).filter((entry) => entry.entryType === "DISPATCH_RESERVED" && entry.itemHash === itemHash && entry.role === role);
  const completed = new Map((entries ?? []).filter((entry) => entry.entryType === "DISPATCH_COMPLETED").map((entry) => [entry.reservationHash, entry]));
  const successes = reservations.filter((reservation) => completed.get(reservation.selfHash)?.attemptStatus === "SUCCEEDED");
  const failures = reservations.filter((reservation) => completed.has(reservation.selfHash) && completed.get(reservation.selfHash)?.attemptStatus !== "SUCCEEDED");
  const active = reservations.filter((reservation) => !completed.has(reservation.selfHash));
  return { reservations, successes, failures, active };
}

function nextDeepSeekAction(input) {
  const items = input.inventory.items;
  const canaryOnly = input.mode === "DEEPSEEK_CANARY";
  if (!canaryOnly && input.mode !== "DEEPSEEK_RESUME") throw new TypeError("DeepSeek dispatch mode is invalid");
  if (!canaryOnly && (!input.canaryGate || input.canaryGate.state !== "CANARY_INTEGRITY_CLEARED_NO_TUNING")) {
    throw new TypeError("DeepSeek resume requires the immutable state-bound canary gate");
  }
  if (canaryOnly && input.canaryGate) return null;
  const baseItems = canaryOnly ? items.slice(0, 1) : items.slice(1);
  for (const item of baseItems) {
    for (const role of DEEPSEEK_BASE_ROLES) {
      const state = roleState(input.ledgerEntries, item.itemHash, role);
      if (state.successes.length === 1) continue;
      if (state.successes.length > 1 || state.reservations.length > 2 || state.failures.length >= 2) throw new TypeError("DeepSeek item-role reached a terminal execution state");
      if (state.active.length > 0) throw new TypeError("DeepSeek item-role has an active attempt pending authenticated recovery");
      return { item, role, failedAttemptsForItemRole: state.failures.length };
    }
  }
  if (canaryOnly) {
    if (!input.canaryPredicateReceipt) throw new TypeError("DeepSeek canary C0 predicate receipt is required after B-prime revision");
    if (!input.canaryPredicateReceipt.selectedForC0) return null;
    for (const role of C0_ROLES) {
      const state = roleState(input.ledgerEntries, items[0].itemHash, role);
      if (state.successes.length === 1) continue;
      if (state.successes.length > 1 || state.reservations.length > 2 || state.failures.length >= 2) throw new TypeError("DeepSeek canary C0 role reached a terminal execution state");
      if (state.active.length > 0) throw new TypeError("DeepSeek canary C0 role has an active attempt pending authenticated recovery");
      return { item: items[0], role, failedAttemptsForItemRole: state.failures.length };
    }
    return null;
  }
  if (!input.c0ExecutionSet) throw new TypeError("exact R5 C0 execution set is required after all B-prime revisions");
  const selected = new Set(input.c0ExecutionSet.selectedItemHashes);
  for (const item of items) if (selected.has(item.itemHash)) for (const role of C0_ROLES) {
    const state = roleState(input.ledgerEntries, item.itemHash, role);
    if (state.successes.length === 1) continue;
    if (state.successes.length > 1 || state.reservations.length > 2 || state.failures.length >= 2) throw new TypeError("DeepSeek C0 item-role reached a terminal execution state");
    if (state.active.length > 0) throw new TypeError("DeepSeek C0 item-role has an active attempt pending authenticated recovery");
    return { item, role, failedAttemptsForItemRole: state.failures.length };
  }
  return null;
}

export function buildCanaryGateReceiptV5R5(input) {
  const errors = validateC0PredicateReceiptV5R5({
    ...(input.canaryPredicateContext ?? {}),
    activeRunnerRegistrationHash: input.activeRegistration?.selfHash,
    executionRegistrationHash: input.executionRegistration?.selfHash,
    inventoryHash: input.inventory?.selfHash,
    item: input.inventory?.items?.[0],
    predicateReceipt: input.canaryPredicateReceipt,
  });
  errors.push(...validateExecutionLedgerEntriesV5R4({ entries: input.ledgerEntries ?? [], authorization: input.authorization, inventory: input.inventory }));
  if (errors.length > 0) throw new TypeError(errors.join("; "));
  const canary = input.inventory.items[0];
  const reservations = input.ledgerEntries.filter((entry) => entry.entryType === "DISPATCH_RESERVED");
  const completions = input.ledgerEntries.filter((entry) => entry.entryType === "DISPATCH_COMPLETED");
  requireCondition(reservations.length > 0 && reservations.every(({ itemHash }) => itemHash === canary.itemHash),
    "canary gate cannot include a reservation for a non-canary item");
  const requiredRoleOrder = [...DEEPSEEK_BASE_ROLES, ...(input.canaryPredicateReceipt.selectedForC0 ? C0_ROLES : [])];
  const successful = completions.filter(({ attemptStatus }) => attemptStatus === "SUCCEEDED");
  const outputHashes = requiredRoleOrder.map((role) => {
    const matches = successful.filter(({ roleOutput }) => roleOutput?.itemHash === canary.itemHash && roleOutput?.role === role);
    requireCondition(matches.length === 1, `canary gate requires exactly one successful ${role}`);
    return matches[0].roleOutput.selfHash;
  });
  requireCondition(successful.length === requiredRoleOrder.length, "canary gate contains an extra successful role");
  const audits = (input.dispatchAudits ?? []).filter(({ providerAuthorizationHash }) => providerAuthorizationHash === input.authorization.selfHash);
  requireCondition(audits.length === reservations.length && audits.every((audit) => validateSelfHashV5R3(audit)
    && audit.schemaVersion === "StateBoundDispatchAuditReceiptV1" && audit.activeRunnerRegistrationHash === input.activeRegistration.selfHash
    && audit.providerAuthorizationHash === input.authorization.selfHash && audit.itemHash === canary.itemHash)
    && reservations.every((reservation) => audits.some(({ attemptId }) => attemptId === reservation.attemptId)),
  "canary gate does not contain one state-bound dispatch audit for every reservation");
  requireCondition(Number.isFinite(Date.parse(input.passedAt)) && completions.every((entry) => Date.parse(input.passedAt) > Date.parse(entry.providerEventReceipt.finishedAt)),
    "canary gate must strictly postdate all canary attempts");
  const gate = sealV5R3Artifact({
    schemaVersion: "CanaryGateReceiptV2",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash: input.activeRegistration.selfHash,
    compatibilityBaseRunnerRegistrationHash: input.registration.selfHash,
    executionRegistrationHash: input.executionRegistration.selfHash,
    deepSeekAuthorizationHash: input.authorization.selfHash,
    sampleExecutionInventoryHash: input.inventory.selfHash,
    canaryItemHash: canary.itemHash,
    manifestOrdinal: 1,
    c0PredicateReceiptHash: input.canaryPredicateReceipt.selfHash,
    selectedForC0: input.canaryPredicateReceipt.selectedForC0,
    requiredRoleOrder,
    successfulRoleOutputHashes: outputHashes,
    providerEventReceiptHashes: completions.map(({ providerEventReceiptHash }) => providerEventReceiptHash),
    stateBoundDispatchAuditHashes: audits.map(({ selfHash }) => selfHash),
    ledgerTerminalHash: input.ledgerEntries.at(-1).selfHash,
    tuningAllowed: false,
    state: "CANARY_INTEGRITY_CLEARED_NO_TUNING",
    passedAt: input.passedAt,
  });
  assertClosedSelfHashedArtifactV5R5(gate, "CanaryGateReceiptV2");
  return gate;
}

export function validateCanaryGateReceiptV5R5(input) {
  const errors = [...validateClosedSelfHashedArtifactV5R5(input?.canaryGate, "CanaryGateReceiptV2")];
  try {
    const terminalIndex = (input.ledgerEntries ?? []).findIndex(({ selfHash }) => selfHash === input.canaryGate?.ledgerTerminalHash);
    requireCondition(terminalIndex >= 0, "canary gate terminal is absent from the ledger");
    const terminalAttempts = new Set(input.canaryGate.stateBoundDispatchAuditHashes);
    const audits = (input.dispatchAudits ?? []).filter(({ selfHash }) => terminalAttempts.has(selfHash));
    const rebuilt = buildCanaryGateReceiptV5R5({ ...input, ledgerEntries: input.ledgerEntries.slice(0, terminalIndex + 1),
      dispatchAudits: audits, passedAt: input.canaryGate.passedAt });
    if (canonicalJsonV5R3(rebuilt) !== canonicalJsonV5R3(input.canaryGate)) errors.push("R5 canary gate differs from exact state-bound reconstruction");
  } catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }
  return Object.freeze([...new Set(errors)]);
}

export function buildDeepSeekPlanReceiptKernelV5R5(input) {
  const action = nextDeepSeekAction(input);
  if (!action) return null;
  return sealV5R3Artifact({
    schemaVersion: "ExecutionPlanReceiptV1",
    designId: "MAIS-NATURAL-CA60-V5",
    runnerRegistrationHash: input.registration.selfHash,
    provider: "DEEPSEEK_DIRECT",
    mode: input.mode,
    planStatus: "NEXT_ACTION",
    itemHash: action.item.itemHash,
    manifestOrdinal: action.item.manifestOrdinal,
    role: action.role,
    failedAttemptsForItemRole: action.failedAttemptsForItemRole,
    ledgerTerminalHash: input.ledgerEntries?.at(-1)?.selfHash ?? null,
    c0DecisionHash: C0_ROLES.includes(action.role)
      ? input.c0ExecutionSet.decisions.find(({ itemHash }) => itemHash === action.item.itemHash)?.selfHash ?? null
      : null,
    generatedAt: input.at,
  });
}

function expectedPlan(input) {
  if (input.provider === "OPENAI_DIRECT") {
    return planOpenAIReferenceResumeV5R4({
      registration: input.registration,
      authorization: input.authorization,
      inventory: input.inventory,
      ledgerEntries: input.ledgerEntries ?? [],
      generatedAt: input.at,
    });
  }
  return buildDeepSeekPlanReceiptKernelV5R5(input);
}

export function planStateBoundNextActionV5R5(input) {
  const errors = validateStateBoundDispatchV5R5({ ...input, role: input.role ?? "__PLAN_ONLY__", itemHash: input.itemHash ?? input.inventory?.items?.[0]?.itemHash });
  // Ignore only the final requested-action comparison during plan-only use; all
  // authorization, manifest, route, execution-registration and C0 checks remain.
  const structural = errors.filter((error) => !/requested item\/role differs|adjudication is not required/iu.test(error));
  if (structural.length > 0) throw new TypeError(structural.join("; "));
  return expectedPlan(input);
}

export function validateStateBoundDispatchV5R5(input) {
  const errors = [];
  try { errors.push(...validateProviderActivationV5R5(input)); } catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }
  add(errors, hash(input?.activeRegistration?.selfHash ?? input?.activeRunnerRegistrationHash), "active V5-R5 runner registration is absent");
  add(errors, input?.freshReview?.decision === "CONCURRED" && input?.freshReview?.findingCount === 0,
    "fresh A11 V5-R5 review must be CONCURRED with zero findings");
  add(errors, input?.ownerActivationGrant?.providerExecutionAuthorized === true
    && input?.ownerActivationGrant?.activeRunnerRegistrationHash === (input?.activeRegistration?.selfHash ?? input?.activeRunnerRegistrationHash),
  "separate owner activation grant is absent or does not bind V5-R5");
  errors.push(...validateManifestBoundInventoryV5R5(input));
  errors.push(...validateAuthenticatedRouteEvidenceV5R5({ receipt: input?.authenticatedRouteEvidence }));
  add(errors, validateSelfHashV5R3(input?.costPreview)
    && input?.costPreview?.activeRunnerRegistrationHash === (input?.activeRegistration?.selfHash ?? input?.activeRunnerRegistrationHash),
  "independently recomputed cost preview is absent or not bound to V5-R5");
  if (input?.provider === "DEEPSEEK_DIRECT") {
    add(errors, input?.executionRegistration?.schemaVersion === "DeepSeekExecutionRegistrationV3",
      "DeepSeek execution registration is required before any B-prime or C0 dispatch");
    if (input?.executionRegistration) {
      errors.push(...validateDeepSeekExecutionRegistrationV5R5({
        ...(input.executionRegistrationContext ?? input),
        executionRegistration: input.executionRegistration,
      }));
    }
    if (input?.mode === "DEEPSEEK_CANARY" && input?.canaryPredicateReceipt) {
      const canaryItem = input.inventory?.items?.[0];
      errors.push(...validateC0PredicateReceiptV5R5({
        ...(input.canaryPredicateContext ?? {}),
        activeRunnerRegistrationHash: input.activeRegistration?.selfHash ?? input.activeRunnerRegistrationHash,
        executionRegistrationHash: input.executionRegistration?.selfHash,
        inventoryHash: input.inventory?.selfHash,
        item: canaryItem,
        predicateReceipt: input.canaryPredicateReceipt,
      }));
    }
    if (input?.c0ExecutionSet) {
      errors.push(...validateDeepSeekC0ExecutionSetV5R5({ ...(input.c0ExecutionSetContext ?? input), c0ExecutionSet: input.c0ExecutionSet }));
    }
    if (input?.canaryGate) {
      errors.push(...validateCanaryGateReceiptV5R5({ ...input, canaryGate: input.canaryGate,
        dispatchAudits: input.dispatchAudits ?? [] }));
    }
    if (C0_ROLES.includes(input?.role)) {
      if (input.mode === "DEEPSEEK_CANARY") {
        add(errors, input?.canaryPredicateReceipt?.selectedForC0 === true,
          "canary C0 dispatch is not selected by the exact four-input predicate receipt");
      } else {
      add(errors, input?.c0ExecutionSet?.schemaVersion === "DeepSeekC0ExecutionSetV3",
        "exact R5 C0 execution set is required before any C0 dispatch");
      if (input?.c0ExecutionSet) {
        add(errors, input.c0ExecutionSet.selectedItemHashes.includes(input.itemHash ?? input.inventory?.items?.[0]?.itemHash),
          "C0 dispatch item is outside the exact random/mandatory union");
      }
      }
    }
  } else if (input?.provider === "OPENAI_DIRECT" && input?.role === "ADJUDICATOR") {
    add(errors, input?.adjudicationTrigger?.adjudicationRequired === true && validateSelfHashV5R3(input.adjudicationTrigger),
      "adjudication is not required by an exact locally rebuilt A/B trigger");
  } else add(errors, input?.provider === "OPENAI_DIRECT", "provider is outside the frozen runner tuples");

  if (errors.length === 0) {
    try {
      const plan = expectedPlan(input);
      add(errors, plan?.planStatus === "NEXT_ACTION", "planner does not permit another provider action");
      add(errors, plan?.role === input.role && plan?.itemHash === input.itemHash,
        "requested item/role differs from the exact first dependency-ready planner action");
      if (input.provider === "OPENAI_DIRECT" && input.role === "ADJUDICATOR") {
        add(errors, plan?.c0DecisionHash === null, "OpenAI plan carries unexpected C0 state");
      }
    } catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }
  }
  return Object.freeze([...new Set(errors)]);
}

export function buildStateBoundDispatchAuditV5R5(input) {
  const errors = validateStateBoundDispatchV5R5(input);
  if (errors.length > 0) throw new TypeError(errors.join("; "));
  const plan = expectedPlan(input);
  const activeHash = input.activeRegistration?.selfHash ?? input.activeRunnerRegistrationHash;
  const planHash = plan.selfHash ?? sha256V5R3(canonicalJsonV5R3(plan));
  const attemptOrdinal = plan.failedAttemptsForItemRole + 1;
  const attemptId = `V5R5:${activeHash}:${planHash}:${attemptOrdinal}`;
  return sealV5R3Artifact({
    schemaVersion: "StateBoundDispatchAuditReceiptV1",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash: activeHash,
    compatibilityBaseRunnerRegistrationHash: input.registration.selfHash,
    freshRunnerReviewHash: input.freshReview.selfHash,
    ownerActivationGrantHash: input.ownerActivationGrant.selfHash,
    providerAuthorizationHash: input.authorization.selfHash,
    authenticatedRouteEvidenceHash: input.authenticatedRouteEvidence.selfHash,
    costPreviewHash: input.costPreview.selfHash,
    sampleExecutionInventoryHash: input.inventory.selfHash,
    executionRegistrationHash: input.provider === "DEEPSEEK_DIRECT" ? input.executionRegistration.selfHash : null,
    c0ExecutionSetHash: C0_ROLES.includes(input.role) && input.mode !== "DEEPSEEK_CANARY" ? input.c0ExecutionSet.selfHash : null,
    canaryPredicateReceiptHash: C0_ROLES.includes(input.role) && input.mode === "DEEPSEEK_CANARY" ? input.canaryPredicateReceipt.selfHash : null,
    adjudicationTriggerHash: input.role === "ADJUDICATOR" ? input.adjudicationTrigger.selfHash : null,
    canaryGateHash: input.mode === "DEEPSEEK_RESUME" ? input.canaryGate.selfHash : null,
    executionPlan: structuredClone(plan),
    executionPlanHash: planHash,
    preReservationLedgerTerminalHash: input.ledgerEntries?.at(-1)?.selfHash ?? null,
    itemHash: plan.itemHash,
    role: plan.role,
    attemptOrdinal,
    attemptId,
    issuedAt: input.at,
  });
  assertClosedSelfHashedArtifactV5R5(audit, "StateBoundDispatchAuditReceiptV1");
  return audit;
}

export function validateStateBoundDispatchAuditV5R5(input) {
  const errors = [...validateClosedSelfHashedArtifactV5R5(input?.dispatchAudit, "StateBoundDispatchAuditReceiptV1")];
  if (!validateSelfHashV5R3(input?.dispatchAudit)) errors.push("state-bound dispatch audit self-hash is invalid");
  try {
    const rebuilt = buildStateBoundDispatchAuditV5R5(input);
    if (canonicalJsonV5R3(rebuilt) !== canonicalJsonV5R3(input.dispatchAudit)) errors.push("state-bound dispatch audit differs from full planner reconstruction");
  } catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }
  return Object.freeze([...new Set(errors)]);
}

export const STATE_BOUND_DISPATCH_V5_R5_CONSTANTS = Object.freeze({
  deepSeekBaseRoles: DEEPSEEK_BASE_ROLES,
  c0Roles: C0_ROLES,
  onlyDispatchRule: "EXACT_FIRST_DEPENDENCY_READY_PLANNER_ACTION_WITH_FULL_UPSTREAM_RECONSTRUCTION",
});
