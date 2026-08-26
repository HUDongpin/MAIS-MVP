import AUTHORITY_SCHEMA from "./schemas/SemanticDispatchAuthorityReceiptV1.schema.json" with { type: "json" };
import VERIFICATION_SCHEMA from "./schemas/SemanticDispatchVerificationReceiptV1.schema.json" with { type: "json" };

import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  validateExecutionLedgerEntriesV5R4,
} from "./atomic-execution-ledger-v5-r4.mjs";
import {
  buildDeepSeekPlanReceiptKernelV5R5,
} from "./state-bound-dispatch-v5-r5.mjs";
import {
  validateC0PredicateReceiptV5R5,
} from "./c0-trigger-v5-r5.mjs";
import {
  validateCanaryGateReceiptV5R7 as validateCanaryGateReceiptV5R10,
  validateNormalC0ExecutionSetV5R7 as validateNormalC0ExecutionSetV5R10,
} from "./c0-state-v5-r7.mjs";
import {
  assertClosedSelfHashedArtifactV5R10,
  validateClosedSelfHashedArtifactV5R10,
} from "./schema-contract-v5-r10.mjs";

const C0_ROLES = Object.freeze(["C0_PRIME_ROLE_1", "C0_PRIME_ROLE_2", "C0_PRIME_ROLE_3",
  "C0_PRIME_ROLE_4", "C0_PRIME_ROLE_5"]);

function requireCondition(condition, message) {
  if (!condition) throw new TypeError(message);
}

function root(entries) {
  return sha256V5R3(canonicalJsonV5R3((entries ?? []).map(({ selfHash }) => selfHash)));
}

function assertCommon(input) {
  const errors = [
    ...validateClosedSelfHashedArtifactV5R10(input?.activeRegistration,
      input?.activeRegistration?.schemaVersion),
    ...validateClosedSelfHashedArtifactV5R10(input?.authorization, "ProviderAuthorizationV5"),
    ...validateClosedSelfHashedArtifactV5R10(input?.executionRegistration,
      "DeepSeekExecutionRegistrationV4"),
    ...validateClosedSelfHashedArtifactV5R10(input?.inventory, "SampleExecutionInventoryV2"),
  ];
  try {
    errors.push(...validateExecutionLedgerEntriesV5R4({
      entries: input?.ledgerEntries ?? [],
      authorization: input?.authorization?.compatibilityAuthorization,
      inventory: input?.inventory,
    }));
  } catch (error) {
    errors.push(`ledger validation exception: ${error instanceof Error ? error.message : String(error)}`);
  }
  requireCondition(errors.length === 0, `R10 semantic-dispatch upstream validation failed: ${errors.join("; ")}`);
  requireCondition(input.authorization.provider === "DEEPSEEK_DIRECT"
    && input.authorization.activeRunnerRegistrationHash === input.activeRegistration.selfHash
    && input.authorization.compatibilityAuthorizationHash === input.authorization.compatibilityAuthorization.selfHash
    && input.executionRegistration.activeRunnerRegistrationHash === input.activeRegistration.selfHash
    && input.executionRegistration.deepSeekAuthorizationHash === input.authorization.selfHash
    && input.executionRegistration.sampleExecutionInventoryHash === input.inventory.selfHash,
  "R10 semantic-dispatch registration, authorization, and inventory bindings are invalid");
}

function validateSemanticState(input) {
  const errors = [];
  if (input.canaryPredicateReceipt) {
    const canary = input.inventory.items[0];
    errors.push(...validateC0PredicateReceiptV5R5({
      activeRunnerRegistrationHash: input.activeRegistration.selfHash,
      executionRegistrationHash: input.executionRegistration.selfHash,
      inventoryHash: input.inventory.selfHash,
      item: canary,
      predicateInput: input.canaryPredicateInput,
      predicateReceipt: input.canaryPredicateReceipt,
    }));
  }
  if (input.canaryGate) {
    errors.push(...validateCanaryGateReceiptV5R10({
      ...(input.canaryGateContext ?? {}),
      canaryGate: input.canaryGate,
    }));
  }
  if (input.c0ExecutionSet) {
    errors.push(...validateNormalC0ExecutionSetV5R10({
      activeRunnerRegistrationHash: input.activeRegistration.selfHash,
      executionRegistrationHash: input.executionRegistration.selfHash,
      inventory: input.inventory,
      predicateInputsByItem: input.predicateInputsByItem,
      c0ExecutionSet: input.c0ExecutionSet,
    }));
  }
  return errors;
}

export function buildCompatibilityCanaryC0DecisionSetV5R10(canaryPredicateReceipt) {
  requireCondition(canaryPredicateReceipt?.schemaVersion === "DeepSeekC0PredicateReceiptV1"
    && /^[0-9a-f]{64}$/u.test(canaryPredicateReceipt.selfHash ?? ""),
  "R10 compatibility canary decision set requires the exact sealed canary predicate");
  return Object.freeze({
    decisions: Object.freeze([canaryPredicateReceipt]),
    selectedItemHashes: Object.freeze(canaryPredicateReceipt.selectedForC0
      ? [canaryPredicateReceipt.itemHash] : []),
  });
}

export function buildSemanticDispatchAuthorityV5R10(input) {
  assertCommon(input);
  const semanticErrors = validateSemanticState(input);
  requireCondition(semanticErrors.length === 0,
    `R10 semantic canary/C0 state is not exactly rebuildable: ${semanticErrors.join("; ")}`);
  requireCondition(["DEEPSEEK_CANARY", "DEEPSEEK_RESUME"].includes(input.mode),
    "R10 semantic-dispatch mode is invalid");
  const canary = input.inventory.items[0];
  const canaryFirstVerified = input.mode === "DEEPSEEK_CANARY"
    ? input.ledgerEntries.filter(({ entryType }) => entryType === "DISPATCH_RESERVED")
      .every(({ itemHash }) => itemHash === canary.itemHash)
    : input.canaryGate?.state === "CANARY_INTEGRITY_CLEARED_NO_TUNING";
  requireCondition(canaryFirstVerified,
    "R10 semantic dispatch cannot proceed before an exact canary-first gate");
  if (input.mode === "DEEPSEEK_RESUME") {
    requireCondition(input.canaryGate
      && ((input.c0ExecutionSet === null && input.predicateInputsByItem === null)
        || (input.c0ExecutionSet && input.predicateInputsByItem instanceof Map)),
    "R10 resume requires the exact canary gate and either pre-C0 base-role state or a frozen normal C0 set");
  }
  const compatibilityC0ExecutionSet = input.mode === "DEEPSEEK_CANARY" && input.canaryPredicateReceipt
    ? buildCompatibilityCanaryC0DecisionSetV5R10(input.canaryPredicateReceipt)
    : input.c0ExecutionSet;
  const plan = buildDeepSeekPlanReceiptKernelV5R5({
    registration: input.registration,
    authorization: input.authorization.compatibilityAuthorization,
    inventory: input.inventory,
    mode: input.mode,
    ledgerEntries: input.ledgerEntries,
    canaryGate: input.canaryGate,
    canaryPredicateReceipt: input.canaryPredicateReceipt,
    c0ExecutionSet: compatibilityC0ExecutionSet,
    at: input.issuedAt,
  });
  requireCondition(plan?.planStatus === "NEXT_ACTION", "R10 frozen planner has no dispatchable next action");
  const c0Role = C0_ROLES.includes(plan.role);
  const selectedC0MembershipVerified = !c0Role || (input.mode === "DEEPSEEK_CANARY"
    ? input.canaryPredicateReceipt?.selectedForC0 === true
    : input.c0ExecutionSet?.selectedItemHashes?.includes(plan.itemHash) === true);
  requireCondition(selectedC0MembershipVerified,
    "R10 C0 action is outside the exact predicate/random-plus-mandatory selected set");
  const item = input.inventory.items[plan.manifestOrdinal - 1];
  requireCondition(item?.itemHash === plan.itemHash, "R10 planner item is outside the manifest-bound inventory");
  const attemptOrdinal = plan.failedAttemptsForItemRole + 1;
  const attemptId = `V5R10:${input.activeRegistration.selfHash}:${plan.selfHash}:${attemptOrdinal}`;
  const receipt = sealV5R3Artifact({
    schemaVersion: "SemanticDispatchAuthorityReceiptV1",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash: input.activeRegistration.selfHash,
    authorizationHash: input.authorization.selfHash,
    compatibilityAuthorizationHash: input.authorization.compatibilityAuthorizationHash,
    executionRegistrationHash: input.executionRegistration.selfHash,
    sampleExecutionInventoryHash: input.inventory.selfHash,
    mode: input.mode,
    ledgerPrefixRootHash: root(input.ledgerEntries),
    ledgerPrefixTerminalHash: input.ledgerEntries.at(-1)?.selfHash ?? null,
    compatibilityPlanHash: plan.selfHash,
    canaryPredicateReceiptHash: input.canaryPredicateReceipt?.selfHash ?? null,
    canaryGateHash: input.canaryGate?.selfHash ?? null,
    c0ExecutionSetHash: input.c0ExecutionSet?.selfHash ?? null,
    itemHash: plan.itemHash,
    itemIdPseudonym: item.itemIdPseudonym,
    manifestOrdinal: plan.manifestOrdinal,
    role: plan.role,
    failedAttemptsForItemRole: plan.failedAttemptsForItemRole,
    attemptOrdinal,
    attemptId,
    selectedC0MembershipVerified,
    canaryFirstVerified: true,
    roleOrderVerified: true,
    semanticStatus: "EXACT_FROZEN_PLANNER_INPUTS_REBUILT_BEFORE_RESERVATION",
    issuedAt: input.issuedAt,
  });
  assertClosedSelfHashedArtifactV5R10(receipt, receipt.schemaVersion);
  return receipt;
}

export function validateSemanticDispatchAuthorityV5R10({ semanticDispatchAuthority, ...input }) {
  const errors = [...validateClosedSelfHashedArtifactV5R10(semanticDispatchAuthority,
    "SemanticDispatchAuthorityReceiptV1")];
  try {
    const rebuilt = buildSemanticDispatchAuthorityV5R10({
      ...input,
      issuedAt: semanticDispatchAuthority?.issuedAt,
    });
    if (canonicalJsonV5R3(rebuilt) !== canonicalJsonV5R3(semanticDispatchAuthority)) {
      errors.push("R10 semantic dispatch authority differs from exact frozen planner reconstruction");
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return Object.freeze([...new Set(errors)]);
}

export function buildSemanticDispatchVerificationReceiptV5R10({ activeRegistration, authorization,
  executionRegistration, inventory, mode, ledgerEntries, semanticDispatchAuthorities,
  semanticAuthorityContextsByHash, roleAttemptEvidenceReceipts, canaryPredicateReceipt = null, canaryGate = null,
  c0ExecutionSet = null, verifiedAt }) {
  requireCondition(Array.isArray(semanticDispatchAuthorities)
    && Array.isArray(roleAttemptEvidenceReceipts)
    && semanticDispatchAuthorities.length === roleAttemptEvidenceReceipts.length,
  "R10 semantic verification requires one authority per role-attempt evidence receipt");
  const authorityByHash = new Map(semanticDispatchAuthorities.map((authority) => [authority.selfHash, authority]));
  requireCondition(authorityByHash.size === semanticDispatchAuthorities.length,
    "R10 semantic authorities are duplicated");
  requireCondition(semanticAuthorityContextsByHash instanceof Map,
    "R10 semantic verification requires reconstruction inputs for every authority");
  for (const authority of semanticDispatchAuthorities) {
    const reconstruction = semanticAuthorityContextsByHash.get(authority.selfHash);
    const authorityErrors = reconstruction
      ? validateSemanticDispatchAuthorityV5R10({
        ...reconstruction,
        semanticDispatchAuthority: authority,
      }) : ["authority reconstruction input is absent"];
    requireCondition(authorityErrors.length === 0,
      `R10 semantic authority is not exactly rebuildable: ${authorityErrors.join("; ")}`);
  }
  for (const evidence of roleAttemptEvidenceReceipts) {
    const evidenceErrors = validateClosedSelfHashedArtifactV5R10(evidence, "RoleAttemptEvidenceReceiptV1");
    const semanticAuthority = authorityByHash.get(evidence.semanticDispatchAuthorityHash);
    requireCondition(evidenceErrors.length === 0 && semanticAuthority
      && semanticAuthority.itemHash === evidence.itemHash
      && semanticAuthority.itemIdPseudonym === evidence.itemIdPseudonym
      && semanticAuthority.role === evidence.role,
    `R10 semantic verification found an unbound authority/evidence pair: ${evidenceErrors.join("; ")}`);
  }
  const ordered = [...roleAttemptEvidenceReceipts].sort((left, right) => {
    const a = semanticDispatchAuthorities.findIndex(({ selfHash }) => selfHash === left.semanticDispatchAuthorityHash);
    const b = semanticDispatchAuthorities.findIndex(({ selfHash }) => selfHash === right.semanticDispatchAuthorityHash);
    return a - b;
  });
  const receipt = sealV5R3Artifact({
    schemaVersion: "SemanticDispatchVerificationReceiptV1",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash: activeRegistration.selfHash,
    authorizationHash: authorization.selfHash,
    executionRegistrationHash: executionRegistration.selfHash,
    sampleExecutionInventoryHash: inventory.selfHash,
    mode,
    ledgerPrefixTerminalHash: ledgerEntries.at(-1)?.selfHash ?? null,
    dispatchAuditHashes: ordered.map(({ dispatchAuditHash }) => dispatchAuditHash),
    semanticDispatchAuthorityHashes: ordered.map(({ semanticDispatchAuthorityHash }) =>
      semanticDispatchAuthorityHash),
    roleAttemptEvidenceHashes: ordered.map(({ selfHash }) => selfHash),
    verifiedAttemptCount: ordered.length,
    canaryPredicateReceiptHash: canaryPredicateReceipt?.selfHash ?? null,
    canaryGateHash: canaryGate?.selfHash ?? null,
    c0ExecutionSetHash: c0ExecutionSet?.selfHash ?? null,
    semanticStatus: "EXACT_PLANNER_AND_EVIDENCE_RECONSTRUCTION_VALID",
    verifiedAt,
  });
  assertClosedSelfHashedArtifactV5R10(receipt, receipt.schemaVersion);
  return receipt;
}

export function validateSemanticDispatchVerificationReceiptV5R10({ semanticDispatchVerificationReceipt,
  ...input }) {
  const errors = [...validateClosedSelfHashedArtifactV5R10(semanticDispatchVerificationReceipt,
    "SemanticDispatchVerificationReceiptV1")];
  try {
    const rebuilt = buildSemanticDispatchVerificationReceiptV5R10({
      ...input,
      verifiedAt: semanticDispatchVerificationReceipt?.verifiedAt,
    });
    if (canonicalJsonV5R3(rebuilt) !== canonicalJsonV5R3(semanticDispatchVerificationReceipt)) {
      errors.push("R10 semantic verification differs from exact ordered authority/evidence reconstruction");
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return Object.freeze([...new Set(errors)]);
}

export const SEMANTIC_DISPATCH_V5_R10_CONSTANTS = Object.freeze({
  c0Roles: C0_ROLES,
  callerAuthoredCanaryOrC0ObjectsAccepted: false,
  authorityRequiredBeforeReservation: true,
  compatibilityPlannerInputsValidatedBeforeUse: true,
});
