import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  assertClosedSelfHashedArtifactV5R4,
  validateClosedSelfHashedArtifactV5R4,
} from "./schema-contract-v5-r4.mjs";
import {
  executionLedgerTerminalEvidenceV5R4,
  resolveSuccessfulRoleOutputV5R4,
  validateExecutionLedgerEntriesV5R4,
} from "./atomic-execution-ledger-v5-r4.mjs";
import {
  buildOpenAIAdjudicationTriggerV5R4,
  buildRawMachineReferenceLabelV5R4,
} from "./reference-label-seal-v5-r4.mjs";
import {
  buildDeepSeekC0DecisionForItemV5R4,
} from "./deepseek-execution-control-v5-r4.mjs";

const REFERENCE_BASE_ROLES = Object.freeze(["A_SOLVE", "A_LABEL", "B_SOLVE", "B_LABEL"]);
const DEEPSEEK_BASE_ROLES = Object.freeze(["B_PRIME_CRITIQUE", "B_PRIME_REVISION"]);
const C0_ROLES = Object.freeze(["C0_PRIME_ROLE_1", "C0_PRIME_ROLE_2", "C0_PRIME_ROLE_3", "C0_PRIME_ROLE_4", "C0_PRIME_ROLE_5"]);

function requireCondition(condition, message) { if (!condition) throw new TypeError(message); }

function ledgerState(entries, itemHash, role) {
  const reservations = entries.filter((entry) => entry.entryType === "DISPATCH_RESERVED" && entry.itemHash === itemHash && entry.role === role);
  const completionByReservation = new Map(entries.filter((entry) => entry.entryType === "DISPATCH_COMPLETED").map((entry) => [entry.reservationHash, entry]));
  const active = reservations.filter((entry) => !completionByReservation.has(entry.selfHash));
  const completions = reservations.map((entry) => completionByReservation.get(entry.selfHash)).filter(Boolean);
  const successes = completions.filter((entry) => entry.attemptStatus === "SUCCEEDED");
  return Object.freeze({ reservations, completions, active, successes, failures: completions.filter((entry) => entry.attemptStatus !== "SUCCEEDED") });
}

function createPlan({ registration, provider, mode, planStatus, item = null, role = null, failedAttemptsForItemRole = 0, ledgerEntries, c0Decision = null, generatedAt }) {
  const plan = sealV5R3Artifact({
    schemaVersion: "ExecutionPlanReceiptV1",
    designId: "MAIS-NATURAL-CA60-V5",
    runnerRegistrationHash: registration.selfHash,
    provider,
    mode,
    planStatus,
    itemHash: item?.itemHash ?? null,
    manifestOrdinal: item?.manifestOrdinal ?? null,
    role,
    failedAttemptsForItemRole,
    ledgerTerminalHash: ledgerEntries.at(-1)?.selfHash ?? null,
    c0DecisionHash: c0Decision ? sha256V5R3(canonicalJsonV5R3(c0Decision)) : null,
    generatedAt,
  });
  assertClosedSelfHashedArtifactV5R4(plan, "ExecutionPlanReceiptV1");
  return plan;
}

function planRole({ registration, provider, mode, item, role, ledgerEntries, generatedAt, c0Decision = null }) {
  const state = ledgerState(ledgerEntries, item.itemHash, role);
  if (state.successes.length > 1 || state.reservations.length > 2) return createPlan({ registration, provider, mode, planStatus: "TERMINAL_FAILURE", item, role, failedAttemptsForItemRole: Math.min(2, state.failures.length), ledgerEntries, c0Decision, generatedAt });
  if (state.successes.length === 1) return null;
  if (state.active.length > 0) return createPlan({ registration, provider, mode, planStatus: "ACTIVE_ATTEMPT_PENDING", item, role, failedAttemptsForItemRole: state.failures.length, ledgerEntries, c0Decision, generatedAt });
  if (state.failures.length >= 2) return createPlan({ registration, provider, mode, planStatus: "TERMINAL_FAILURE", item, role, failedAttemptsForItemRole: 2, ledgerEntries, c0Decision, generatedAt });
  return createPlan({ registration, provider, mode, planStatus: "NEXT_ACTION", item, role, failedAttemptsForItemRole: state.failures.length, ledgerEntries, c0Decision, generatedAt });
}

function validatePlanningInputs({ registration, authorization, inventory, ledgerEntries }) {
  assertClosedSelfHashedArtifactV5R4(registration, "NaturalCaExecutionRunnerRegistrationV3");
  assertClosedSelfHashedArtifactV5R4(authorization, "ProviderAuthorizationV4");
  assertClosedSelfHashedArtifactV5R4(inventory, "SampleExecutionInventoryV2");
  const errors = validateExecutionLedgerEntriesV5R4({ entries: ledgerEntries, authorization, inventory });
  requireCondition(errors.length === 0, errors.join("; "));
  requireCondition(authorization.runnerRegistrationHash === registration.selfHash
    && authorization.sampleExecutionInventoryHash === inventory.selfHash, "planner upstream registration, authorization, or inventory binding is invalid");
}

export function planOpenAIReferenceResumeV5R4({ registration, authorization, inventory, ledgerEntries, generatedAt }) {
  validatePlanningInputs({ registration, authorization, inventory, ledgerEntries });
  requireCondition(authorization.provider === "OPENAI_DIRECT", "reference planner requires the OpenAI authorization tuple");
  for (const item of inventory.items) {
    for (const role of REFERENCE_BASE_ROLES) {
      const plan = planRole({ registration, provider: "OPENAI_DIRECT", mode: "REFERENCE_RESUME", item, role, ledgerEntries, generatedAt });
      if (plan) return plan;
    }
    const outputA = resolveSuccessfulRoleOutputV5R4({ entries: ledgerEntries, authorization, inventory, itemHash: item.itemHash, role: "A_LABEL" }).output;
    const outputB = resolveSuccessfulRoleOutputV5R4({ entries: ledgerEntries, authorization, inventory, itemHash: item.itemHash, role: "B_LABEL" }).output;
    const trigger = buildOpenAIAdjudicationTriggerV5R4({ item, labelA: buildRawMachineReferenceLabelV5R4(outputA), labelB: buildRawMachineReferenceLabelV5R4(outputB) });
    if (trigger.adjudicationRequired) {
      const plan = planRole({ registration, provider: "OPENAI_DIRECT", mode: "REFERENCE_RESUME", item, role: "ADJUDICATOR", ledgerEntries, generatedAt });
      if (plan) return plan;
    } else {
      const unexpected = ledgerState(ledgerEntries, item.itemHash, "ADJUDICATOR");
      if (unexpected.reservations.length > 0) return createPlan({ registration, provider: "OPENAI_DIRECT", mode: "REFERENCE_RESUME", planStatus: "TERMINAL_FAILURE", item, role: "ADJUDICATOR", failedAttemptsForItemRole: Math.min(2, unexpected.failures.length), ledgerEntries, generatedAt });
    }
  }
  return createPlan({ registration, provider: "OPENAI_DIRECT", mode: "REFERENCE_RESUME", planStatus: "PHASE_COMPLETE", ledgerEntries, generatedAt });
}

function deepSeekDecision(input, item) {
  return buildDeepSeekC0DecisionForItemV5R4({ ...input, itemHash: item.itemHash });
}

export function planDeepSeekExecutionV5R4(input) {
  const { registration, deepSeekAuthorization: authorization, inventory, ledgerEntries, generatedAt } = input;
  validatePlanningInputs({ registration, authorization, inventory, ledgerEntries });
  requireCondition(authorization.provider === "DEEPSEEK_DIRECT", "DeepSeek planner requires the direct DeepSeek authorization tuple");
  const canary = inventory.items[0];
  if (input.mode === "DEEPSEEK_CANARY") {
    if (input.canaryGate) {
      const errors = validateCanaryGateReceiptV5R4({ ...input, canaryGate: input.canaryGate });
      requireCondition(errors.length === 0, errors.join("; "));
      return createPlan({ registration, provider: "DEEPSEEK_DIRECT", mode: input.mode, planStatus: "PHASE_COMPLETE", ledgerEntries, generatedAt });
    }
    if (ledgerEntries.some((entry) => entry.entryType === "DISPATCH_RESERVED" && entry.itemHash !== canary.itemHash)) {
      return createPlan({ registration, provider: "DEEPSEEK_DIRECT", mode: input.mode, planStatus: "TERMINAL_FAILURE", item: canary, ledgerEntries, generatedAt });
    }
    for (const role of DEEPSEEK_BASE_ROLES) {
      const plan = planRole({ registration, provider: "DEEPSEEK_DIRECT", mode: input.mode, item: canary, role, ledgerEntries, generatedAt });
      if (plan) return plan;
    }
    const decision = deepSeekDecision(input, canary);
    if (decision.selectedForC0) for (const role of C0_ROLES) {
      const plan = planRole({ registration, provider: "DEEPSEEK_DIRECT", mode: input.mode, item: canary, role, ledgerEntries, generatedAt, c0Decision: decision });
      if (plan) return plan;
    }
    return createPlan({ registration, provider: "DEEPSEEK_DIRECT", mode: input.mode, planStatus: "PHASE_COMPLETE", item: canary, ledgerEntries, c0Decision: decision, generatedAt });
  }
  requireCondition(input.mode === "DEEPSEEK_RESUME", "DeepSeek planner mode is invalid");
  if (!input.canaryGate || validateCanaryGateReceiptV5R4({ ...input, canaryGate: input.canaryGate }).length > 0) {
    return createPlan({ registration, provider: "DEEPSEEK_DIRECT", mode: input.mode, planStatus: "CANARY_REQUIRED", item: canary, ledgerEntries, generatedAt });
  }
  for (const item of inventory.items.slice(1)) for (const role of DEEPSEEK_BASE_ROLES) {
    const plan = planRole({ registration, provider: "DEEPSEEK_DIRECT", mode: input.mode, item, role, ledgerEntries, generatedAt });
    if (plan) return plan;
  }
  if (!input.c0ExecutionSet) return createPlan({ registration, provider: "DEEPSEEK_DIRECT", mode: input.mode, planStatus: "C0_SET_REQUIRED", ledgerEntries, generatedAt });
  assertClosedSelfHashedArtifactV5R4(input.c0ExecutionSet, "DeepSeekC0ExecutionSetV2");
  const selected = new Set(input.c0ExecutionSet.selectedItemHashes);
  for (const item of inventory.items) if (selected.has(item.itemHash)) for (const role of C0_ROLES) {
    const plan = planRole({ registration, provider: "DEEPSEEK_DIRECT", mode: input.mode, item, role, ledgerEntries, generatedAt });
    if (plan) return plan;
  }
  return createPlan({ registration, provider: "DEEPSEEK_DIRECT", mode: input.mode, planStatus: "PHASE_COMPLETE", ledgerEntries, generatedAt });
}

export function buildCanaryGateReceiptV5R4(input) {
  const { registration, executionRegistration, deepSeekAuthorization: authorization, inventory, ledgerEntries, passedAt } = input;
  validatePlanningInputs({ registration, authorization, inventory, ledgerEntries });
  assertClosedSelfHashedArtifactV5R4(executionRegistration, "DeepSeekExecutionRegistrationV2");
  const canary = inventory.items[0];
  requireCondition(ledgerEntries.every((entry) => entry.entryType === "DISPATCH_COMPLETED" || entry.itemHash === canary.itemHash), "non-canary item was reserved before the canary gate");
  requireCondition(ledgerEntries.filter((entry) => entry.entryType === "DISPATCH_RESERVED").every((entry) => entry.itemHash === canary.itemHash), "non-canary provider attempt predates the canary gate");
  const decision = deepSeekDecision(input, canary);
  const requiredRoleOrder = [...DEEPSEEK_BASE_ROLES, ...(decision.selectedForC0 ? C0_ROLES : [])];
  const outputs = requiredRoleOrder.map((role) => resolveSuccessfulRoleOutputV5R4({ entries: ledgerEntries, authorization, inventory, itemHash: canary.itemHash, role }).output);
  const receipts = ledgerEntries.filter((entry) => entry.entryType === "DISPATCH_COMPLETED" && entry.providerEventReceipt.itemHash === canary.itemHash)
    .map((entry) => entry.providerEventReceiptHash);
  requireCondition(new Set(receipts).size === receipts.length && Number.isFinite(Date.parse(passedAt)), "canary event receipt set or timestamp is invalid");
  const terminal = executionLedgerTerminalEvidenceV5R4(ledgerEntries);
  const gate = sealV5R3Artifact({
    schemaVersion: "CanaryGateReceiptV1",
    designId: "MAIS-NATURAL-CA60-V5",
    runnerRegistrationHash: registration.selfHash,
    executionRegistrationHash: executionRegistration.selfHash,
    deepSeekAuthorizationHash: authorization.selfHash,
    sampleExecutionInventoryHash: inventory.selfHash,
    canaryItemHash: canary.itemHash,
    manifestOrdinal: 1,
    c0DecisionHash: sha256V5R3(canonicalJsonV5R3(decision)),
    selectedForC0: decision.selectedForC0,
    requiredRoleOrder,
    successfulRoleOutputHashes: outputs.map(({ selfHash }) => selfHash),
    providerEventReceiptHashes: receipts,
    ledgerTerminalHash: terminal.terminalHash,
    tuningAllowed: false,
    state: "CANARY_INTEGRITY_CLEARED_NO_TUNING",
    passedAt,
  });
  assertClosedSelfHashedArtifactV5R4(gate, "CanaryGateReceiptV1");
  return gate;
}

export function validateCanaryGateReceiptV5R4(input) {
  const errors = [...validateClosedSelfHashedArtifactV5R4(input?.canaryGate, "CanaryGateReceiptV1")];
  try {
    const prefixEnd = input.ledgerEntries.findIndex((entry) => entry.selfHash === input.canaryGate?.ledgerTerminalHash);
    requireCondition(prefixEnd >= 0, "canary ledger terminal is absent");
    const prefix = input.ledgerEntries.slice(0, prefixEnd + 1);
    const rebuilt = buildCanaryGateReceiptV5R4({ ...input, ledgerEntries: prefix, passedAt: input.canaryGate?.passedAt });
    if (canonicalJsonV5R3(rebuilt) !== canonicalJsonV5R3(input.canaryGate)) errors.push("canary gate differs from exact manifest-row-one execution reconstruction");
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return Object.freeze([...new Set(errors)]);
}

export const EXECUTION_STATE_V5_R4_CONSTANTS = Object.freeze({
  referenceBaseRoles: REFERENCE_BASE_ROLES,
  deepSeekBaseRoles: DEEPSEEK_BASE_ROLES,
  c0Roles: C0_ROLES,
  canaryManifestOrdinal: 1,
  resumeRule: "ONLY_FIRST_MISSING_DEPENDENCY_READY_ROLE_IN_FROZEN_MANIFEST_ORDER",
});
