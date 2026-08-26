import TERMINAL_PREDICATE_SCHEMA from "./schemas/DeepSeekC0TerminalPredicateReceiptV1.schema.json" with { type: "json" };
import TERMINAL_SET_SCHEMA from "./schemas/DeepSeekC0ExecutionSetV4.schema.json" with { type: "json" };

import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  validateSelfHashV5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  assertClosedSelfHashedAgainstV5R5,
  validateClosedSelfHashedAgainstV5R5,
} from "./schema-contract-v5-r5.mjs";

const HASH = /^[0-9a-f]{64}$/u;
const TERMINAL_CODES = Object.freeze([
  "ATTEMPT_CAP_EXHAUSTED",
  "NETWORK_TERMINAL_FAILURE",
  "SCHEMA_TERMINAL_FAILURE",
  "INTERRUPTED_RECOVERY_UNCERTAIN",
  "ROLE_OUTPUT_MISSING",
  "ROLE_OUTPUT_MALFORMED",
]);

function requireCondition(condition, message) {
  if (!condition) throw new TypeError(message);
}

function evidenceStatus(value) {
  if (value === null || value === undefined) return "MISSING";
  return validateSelfHashV5R3(value) ? "VALID" : "MALFORMED";
}

export function buildTerminalC0PredicateReceiptV5R6({
  activeRunnerRegistrationHash,
  executionRegistrationHash,
  inventoryHash,
  item,
  critiqueEvidence,
  revisionEvidence,
  terminalEvidenceCode,
}) {
  requireCondition(HASH.test(activeRunnerRegistrationHash ?? "") && HASH.test(executionRegistrationHash ?? "")
    && HASH.test(inventoryHash ?? ""), "terminal C0 upstream hash is invalid");
  requireCondition(item && HASH.test(item.itemHash ?? "") && typeof item.itemIdPseudonym === "string"
    && Number.isSafeInteger(item.manifestOrdinal), "terminal C0 item identity is invalid");
  requireCondition(TERMINAL_CODES.includes(terminalEvidenceCode), "terminal C0 evidence code is invalid");
  const critiqueEvidenceStatus = evidenceStatus(critiqueEvidence);
  const revisionEvidenceStatus = evidenceStatus(revisionEvidence);
  requireCondition(critiqueEvidenceStatus !== "VALID" || revisionEvidenceStatus !== "VALID",
    "terminal C0 receipt is only for missing or malformed B-prime evidence");
  const receipt = sealV5R3Artifact({
    schemaVersion: "DeepSeekC0TerminalPredicateReceiptV1",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash,
    executionRegistrationHash,
    sampleExecutionInventoryHash: inventoryHash,
    itemHash: item.itemHash,
    itemIdPseudonym: item.itemIdPseudonym,
    manifestOrdinal: item.manifestOrdinal,
    critiqueEvidenceStatus,
    revisionEvidenceStatus,
    terminalEvidenceCode,
    malformedOrMissingInputDisposition: "TRIGGER",
    unknownInputDisposition: "TRIGGER",
    mandatoryReasonCodes: ["INVALID_TAXONOMY_SCHEMA_OR_ROLE"],
    mandatoryTrigger: true,
    registeredRandomAudit: item.registeredRandomAudit === true,
    selectedForC0: true,
    openAIReferenceInputCount: 0,
  });
  assertClosedSelfHashedAgainstV5R5(receipt, TERMINAL_PREDICATE_SCHEMA, receipt.schemaVersion);
  return receipt;
}

export function validateTerminalC0PredicateReceiptV5R6(receipt) {
  return validateClosedSelfHashedAgainstV5R5(receipt, TERMINAL_PREDICATE_SCHEMA);
}

export function buildTerminalC0ExecutionSetV5R6({
  activeRunnerRegistrationHash,
  executionRegistrationHash,
  inventory,
  predicateReceipts,
}) {
  requireCondition(inventory?.items?.length === 60 && Array.isArray(predicateReceipts)
    && predicateReceipts.length === 60, "terminal C0 set requires all 60 registered items and predicates");
  const byHash = new Map(predicateReceipts.map((receipt) => [receipt?.itemHash, receipt]));
  requireCondition(byHash.size === 60, "terminal C0 predicate item hashes are duplicated");
  const decisions = inventory.items.map((item) => {
    const receipt = byHash.get(item.itemHash);
    requireCondition(receipt && validateTerminalC0PredicateReceiptV5R6(receipt).length === 0
      && receipt.activeRunnerRegistrationHash === activeRunnerRegistrationHash
      && receipt.executionRegistrationHash === executionRegistrationHash
      && receipt.sampleExecutionInventoryHash === inventory.selfHash
      && receipt.manifestOrdinal === item.manifestOrdinal,
    "terminal C0 predicate does not bind the exact item, inventory, registration, and execution registration");
    return receipt;
  });
  const selectedItemHashes = decisions.filter(({ selectedForC0 }) => selectedForC0).map(({ itemHash }) => itemHash);
  const executionSet = sealV5R3Artifact({
    schemaVersion: "DeepSeekC0ExecutionSetV4",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash,
    executionRegistrationHash,
    sampleExecutionInventoryHash: inventory.selfHash,
    predicateReceiptHashes: decisions.map(({ selfHash }) => selfHash),
    decisions: decisions.map((receipt) => structuredClone(receipt)),
    selectedItemHashes,
    selectedItemCount: selectedItemHashes.length,
    expectedSuccessfulCallCount: 120 + (5 * selectedItemHashes.length),
    selectionFormula: "UNION(MANDATORY_TRIGGER_SET,RANDOM_AUDIT_12_SET)",
    unknownOrMalformedDisposition: "TRIGGER",
    terminalMissingEvidenceDisposition: "TRIGGER_WITHOUT_IMPUTATION",
    openAIReferenceInputCount: 0,
  });
  assertClosedSelfHashedAgainstV5R5(executionSet, TERMINAL_SET_SCHEMA, executionSet.schemaVersion);
  return executionSet;
}

export function validateTerminalC0ExecutionSetV5R6({ inventory, executionSet }) {
  const errors = [...validateClosedSelfHashedAgainstV5R5(executionSet, TERMINAL_SET_SCHEMA)];
  try {
    const rebuilt = buildTerminalC0ExecutionSetV5R6({
      activeRunnerRegistrationHash: executionSet.activeRunnerRegistrationHash,
      executionRegistrationHash: executionSet.executionRegistrationHash,
      inventory,
      predicateReceipts: executionSet.decisions,
    });
    if (canonicalJsonV5R3(rebuilt) !== canonicalJsonV5R3(executionSet)) {
      errors.push("terminal C0 execution set differs from exact reconstruction");
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return Object.freeze([...new Set(errors)]);
}

export const C0_TERMINAL_V5_R6_CONSTANTS = Object.freeze({
  terminalEvidenceCodes: TERMINAL_CODES,
  missingOrMalformedDisposition: "TRIGGER_WITHOUT_IMPUTATION",
});
