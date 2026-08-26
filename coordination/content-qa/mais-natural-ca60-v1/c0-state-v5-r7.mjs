import CANARY_SCHEMA from "./schemas/CanaryGateReceiptV3.schema.json" with { type: "json" };
import ROLE_ATTEMPT_SCHEMA from "./schemas/RoleAttemptEvidenceReceiptV1.schema.json" with { type: "json" };
import SEMANTIC_SCHEMA from "./schemas/SemanticDispatchVerificationReceiptV1.schema.json" with { type: "json" };

import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  validateSelfHashV5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  buildC0PredicateInputFromProtectedEvidenceV5R5,
  buildC0PredicateReceiptV5R5,
  buildDeepSeekC0ExecutionSetV5R5,
  validateC0PredicateReceiptV5R5,
  validateDeepSeekC0ExecutionSetV5R5,
} from "./c0-trigger-v5-r5.mjs";
import {
  assertClosedSelfHashedAgainstV5R5,
  validateClosedSelfHashedAgainstV5R5,
} from "./schema-contract-v5-r5.mjs";
import {
  validateClosedSelfHashedArtifactV5R7,
} from "./schema-contract-v5-r7.mjs";

const BASE_ROLES = Object.freeze(["B_PRIME_CRITIQUE", "B_PRIME_REVISION"]);
const C0_ROLES = Object.freeze(["C0_PRIME_ROLE_1", "C0_PRIME_ROLE_2", "C0_PRIME_ROLE_3", "C0_PRIME_ROLE_4", "C0_PRIME_ROLE_5"]);

function requireCondition(condition, message) {
  if (!condition) throw new TypeError(message);
}

function key(itemHash, role) {
  return `${itemHash}:${role}`;
}

function validateRoleAttemptEvidence(receipt) {
  return validateClosedSelfHashedAgainstV5R5(receipt, ROLE_ATTEMPT_SCHEMA);
}

export function buildC0PredicateInputMapV5R7({ inventory, itemLeaves, roleAttemptEvidenceReceipts,
  roleOutputs, targetItemHashes = null }) {
  requireCondition(inventory?.items?.length === 60 && Array.isArray(itemLeaves) && itemLeaves.length === 60
    && Array.isArray(roleAttemptEvidenceReceipts) && Array.isArray(roleOutputs),
  "R7 C0 predicate reconstruction requires exact 60-item inventory/leaves and authoritative role evidence");
  const targetSet = targetItemHashes === null
    ? new Set(inventory.items.map(({ itemHash }) => itemHash)) : new Set(targetItemHashes);
  requireCondition(targetSet.size === (targetItemHashes === null ? 60 : targetItemHashes.length)
    && targetSet.size > 0
    && [...targetSet].every((itemHash) => inventory.items.some((item) => item.itemHash === itemHash)),
  "R7 C0 predicate target set is duplicated, empty, or outside the frozen inventory");
  const targetItems = inventory.items.filter(({ itemHash }) => targetSet.has(itemHash));
  const expectedEvidenceCount = targetItems.length * BASE_ROLES.length;
  const outputByHash = new Map(roleOutputs.map((output) => [output?.selfHash, output]));
  requireCondition(roleOutputs.length === expectedEvidenceCount && outputByHash.size === roleOutputs.length
    && roleOutputs.every((output) => validateSelfHashV5R3(output)
      && validateClosedSelfHashedArtifactV5R7(output, "ProviderRoleOutputV1").length === 0),
  "R7 C0 role outputs are duplicated or fail their closed schema/self-hash");
  const evidenceByKey = new Map();
  for (const receipt of roleAttemptEvidenceReceipts) {
    const errors = validateRoleAttemptEvidence(receipt);
    requireCondition(errors.length === 0 && receipt.provider === "DEEPSEEK_DIRECT"
      && receipt.sampleExecutionInventoryHash === inventory.selfHash
      && receipt.attemptStatus === "SUCCEEDED" && receipt.rawResponseReparsed === true
      && receipt.lineageRebuilt === true && receipt.naturalQuestionReferenceInputCount === 0
      && BASE_ROLES.includes(receipt.role) && targetSet.has(receipt.itemHash),
    `R7 C0 predicate attempt evidence is not successful, raw-reparsed, blind, or base-role bound: ${errors.join("; ")}`);
    const evidenceKey = key(receipt.itemHash, receipt.role);
    requireCondition(!evidenceByKey.has(evidenceKey) && outputByHash.has(receipt.roleOutputHash),
      "R7 C0 predicate evidence is duplicated or lacks its exact role output");
    const output = outputByHash.get(receipt.roleOutputHash);
    requireCondition(output.itemHash === receipt.itemHash && output.itemIdPseudonym === receipt.itemIdPseudonym
      && output.role === receipt.role && output.attemptId === receipt.attemptId
      && output.attemptReceiptHash === receipt.providerEventReceiptHash
      && output.sampleExecutionInventoryHash === inventory.selfHash
      && output.provider === "DEEPSEEK_DIRECT" && output.model === "deepseek-v4-pro"
      && output.endpoint === "https://api.deepseek.com/chat/completions"
      && output.referenceInputCount === 0 && output.deepSeekInputCount === 0,
      "R7 C0 role output differs from its authoritative attempt evidence");
    evidenceByKey.set(evidenceKey, { receipt, output });
  }
  requireCondition(evidenceByKey.size === expectedEvidenceCount,
    `R7 C0 predicate set requires exactly two successful base-role evidence receipts per target item (${expectedEvidenceCount})`);
  const leafById = new Map(itemLeaves.map((leaf) => [leaf.itemId, leaf]));
  requireCondition(leafById.size === 60, "R7 C0 item leaves contain duplicate stable item IDs");
  const predicateInputsByItem = new Map();
  for (const item of targetItems) {
    const leaf = itemLeaves.find((candidate) => candidate.itemHash === item.itemHash)
      ?? leafById.get(item.itemId ?? item.itemIdPseudonym);
    // Runtime protected leaves use stable itemId while synthetic fixtures may
    // bind only through manifest ordinal. No silent fallback beyond the exact
    // one-to-one ordinal is allowed.
    const itemLeaf = leaf ?? itemLeaves[item.manifestOrdinal - 1];
    requireCondition(itemLeaf && itemLeaves.indexOf(itemLeaf) === item.manifestOrdinal - 1,
      "R7 C0 protected item leaf cannot be bound one-to-one to inventory ordinal");
    const critique = evidenceByKey.get(key(item.itemHash, "B_PRIME_CRITIQUE"))?.output;
    const revision = evidenceByKey.get(key(item.itemHash, "B_PRIME_REVISION"))?.output;
    requireCondition(critique && revision, "R7 C0 item lacks successful critique/revision evidence");
    predicateInputsByItem.set(item.itemHash, buildC0PredicateInputFromProtectedEvidenceV5R5({
      item,
      itemLeaf,
      critiqueOutput: critique,
      revisionOutput: revision,
    }));
  }
  return predicateInputsByItem;
}

export function buildCanaryPredicateInputMapV5R7(input) {
  const canary = input?.inventory?.items?.[0];
  requireCondition(canary, "R7 canary predicate input requires the frozen first manifest item");
  return buildC0PredicateInputMapV5R7({
    ...input,
    targetItemHashes: [canary.itemHash],
  });
}

export function buildNormalC0ExecutionSetV5R7({ activeRunnerRegistrationHash, executionRegistrationHash,
  inventory, predicateInputsByItem }) {
  return buildDeepSeekC0ExecutionSetV5R5({ activeRunnerRegistrationHash, executionRegistrationHash,
    inventory, predicateInputsByItem });
}

export function validateNormalC0ExecutionSetV5R7(input) {
  return validateDeepSeekC0ExecutionSetV5R5({
    activeRunnerRegistrationHash: input.activeRunnerRegistrationHash,
    executionRegistrationHash: input.executionRegistrationHash,
    inventory: input.inventory,
    predicateInputsByItem: input.predicateInputsByItem,
    c0ExecutionSet: input.c0ExecutionSet,
  });
}

export function buildCanaryPredicateReceiptV5R7({ activeRunnerRegistrationHash, executionRegistrationHash,
  inventory, predicateInputsByItem }) {
  const canary = inventory?.items?.[0];
  requireCondition(canary && predicateInputsByItem instanceof Map && predicateInputsByItem.has(canary.itemHash),
    "R7 canary predicate requires the exact protected four-field canary input");
  return buildC0PredicateReceiptV5R5({
    activeRunnerRegistrationHash,
    executionRegistrationHash,
    inventoryHash: inventory.selfHash,
    item: canary,
    predicateInput: predicateInputsByItem.get(canary.itemHash),
  });
}

export function buildCanaryGateReceiptV5R7({ activeRunnerRegistrationHash, executionRegistrationHash,
  deepSeekAuthorizationHash, inventory, canaryPredicateReceipt, canaryPredicateInput,
  roleAttemptEvidenceReceipts, roleOutputs, semanticDispatchVerificationReceipt,
  ledgerTerminalHash, passedAt }) {
  const canary = inventory?.items?.[0];
  const predicateErrors = validateC0PredicateReceiptV5R5({ activeRunnerRegistrationHash,
    executionRegistrationHash, inventoryHash: inventory?.selfHash, item: canary,
    predicateInput: canaryPredicateInput, predicateReceipt: canaryPredicateReceipt });
  const semanticErrors = validateClosedSelfHashedAgainstV5R5(semanticDispatchVerificationReceipt,
    SEMANTIC_SCHEMA);
  requireCondition(predicateErrors.length === 0 && semanticErrors.length === 0
    && semanticDispatchVerificationReceipt.mode === "DEEPSEEK_CANARY"
    && semanticDispatchVerificationReceipt.activeRunnerRegistrationHash === activeRunnerRegistrationHash
    && semanticDispatchVerificationReceipt.authorizationHash === deepSeekAuthorizationHash
    && semanticDispatchVerificationReceipt.executionRegistrationHash === executionRegistrationHash
    && semanticDispatchVerificationReceipt.sampleExecutionInventoryHash === inventory.selfHash
    && semanticDispatchVerificationReceipt.canaryPredicateReceiptHash === canaryPredicateReceipt.selfHash,
  `R7 canary gate predicate or semantic-dispatch verification is invalid: ${[...predicateErrors, ...semanticErrors].join("; ")}`);
  const requiredRoleOrder = [...BASE_ROLES, ...(canaryPredicateReceipt.selectedForC0 ? C0_ROLES : [])];
  const evidenceByRole = new Map();
  for (const receipt of roleAttemptEvidenceReceipts ?? []) {
    const errors = validateRoleAttemptEvidence(receipt);
    requireCondition(errors.length === 0 && receipt.itemHash === canary.itemHash
      && receipt.provider === "DEEPSEEK_DIRECT" && receipt.attemptStatus === "SUCCEEDED"
      && receipt.rawResponseReparsed === true && requiredRoleOrder.includes(receipt.role)
      && !evidenceByRole.has(receipt.role),
    `R7 canary role evidence is invalid, duplicated, non-canary, or unnecessary: ${errors.join("; ")}`);
    evidenceByRole.set(receipt.role, receipt);
  }
  requireCondition(evidenceByRole.size === requiredRoleOrder.length
    && requiredRoleOrder.every((role) => evidenceByRole.has(role)),
  "R7 canary gate does not contain exactly one complete role-attempt evidence chain");
  const outputByHash = new Map((roleOutputs ?? []).map((output) => [output.selfHash, output]));
  const orderedEvidence = requiredRoleOrder.map((role) => evidenceByRole.get(role));
  requireCondition(orderedEvidence.every((receipt) => {
    const output = outputByHash.get(receipt.roleOutputHash);
    return output && validateSelfHashV5R3(output) && output.itemHash === canary.itemHash && output.role === receipt.role;
  }), "R7 canary gate role outputs differ from authoritative role-attempt evidence");
  requireCondition(semanticDispatchVerificationReceipt.verifiedAttemptCount === orderedEvidence.length
    && canonicalJsonV5R3(semanticDispatchVerificationReceipt.roleAttemptEvidenceHashes)
      === canonicalJsonV5R3(orderedEvidence.map(({ selfHash }) => selfHash))
    && canonicalJsonV5R3(semanticDispatchVerificationReceipt.dispatchAuditHashes)
      === canonicalJsonV5R3(orderedEvidence.map(({ dispatchAuditHash }) => dispatchAuditHash))
    && canonicalJsonV5R3(semanticDispatchVerificationReceipt.semanticDispatchAuthorityHashes)
      === canonicalJsonV5R3(orderedEvidence.map(({ semanticDispatchAuthorityHash }) =>
        semanticDispatchAuthorityHash)),
  "R7 canary semantic-dispatch verification does not bind the exact ordered attempt evidence");
  requireCondition(/^[0-9a-f]{64}$/u.test(ledgerTerminalHash ?? "")
    && Number.isFinite(Date.parse(passedAt))
    && orderedEvidence.every(({ derivedAt }) => Date.parse(passedAt) > Date.parse(derivedAt)),
  "R7 canary gate chronology or ledger terminal is invalid");
  const gate = sealV5R3Artifact({
    schemaVersion: "CanaryGateReceiptV3",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash,
    executionRegistrationHash,
    deepSeekAuthorizationHash,
    sampleExecutionInventoryHash: inventory.selfHash,
    canaryItemHash: canary.itemHash,
    manifestOrdinal: 1,
    c0PredicateReceiptHash: canaryPredicateReceipt.selfHash,
    selectedForC0: canaryPredicateReceipt.selectedForC0,
    requiredRoleOrder,
    roleAttemptEvidenceHashes: orderedEvidence.map(({ selfHash }) => selfHash),
    successfulRoleOutputHashes: orderedEvidence.map(({ roleOutputHash }) => roleOutputHash),
    rawResponseArtifactHashes: orderedEvidence.map(({ rawResponseArtifactHash }) => rawResponseArtifactHash),
    rawResponseBindingReceiptHashes: orderedEvidence.map(({ rawResponseBindingReceiptHash }) => rawResponseBindingReceiptHash),
    resolvedAttemptReceiptHashes: orderedEvidence.map(({ resolvedAttemptReceiptHash }) => resolvedAttemptReceiptHash),
    stateBoundDispatchAuditHashes: orderedEvidence.map(({ dispatchAuditHash }) => dispatchAuditHash),
    semanticDispatchVerificationReceiptHash: semanticDispatchVerificationReceipt.selfHash,
    ledgerTerminalHash,
    tuningAllowed: false,
    state: "CANARY_INTEGRITY_CLEARED_NO_TUNING",
    passedAt,
  });
  assertClosedSelfHashedAgainstV5R5(gate, CANARY_SCHEMA, gate.schemaVersion);
  return gate;
}

export function validateCanaryGateReceiptV5R7({ canaryGate, ...input }) {
  const errors = [...validateClosedSelfHashedAgainstV5R5(canaryGate, CANARY_SCHEMA)];
  try {
    const rebuilt = buildCanaryGateReceiptV5R7({ ...input,
      ledgerTerminalHash: canaryGate?.ledgerTerminalHash, passedAt: canaryGate?.passedAt });
    if (canonicalJsonV5R3(rebuilt) !== canonicalJsonV5R3(canaryGate)) {
      errors.push("R7 canary gate differs from exact predicate, raw-attempt, semantic-audit, and ledger reconstruction");
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return Object.freeze([...new Set(errors)]);
}

export const C0_STATE_V5_R7_CONSTANTS = Object.freeze({
  baseRoles: BASE_ROLES,
  c0Roles: C0_ROLES,
  normalC0BuilderReachable: true,
  canaryGateRequiresRawAttemptAndSemanticDispatchEvidence: true,
  referenceInputsAllowed: 0,
});
