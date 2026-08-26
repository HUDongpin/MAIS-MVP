import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
  validateSelfHashV5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  reconstructAttemptGraphCoreV5R10,
  roleOutputByEvidenceV5R10,
} from "./attempt-graph-core-v5-r10.mjs";
import {
  assertClosedSelfHashedArtifactV5R10,
  validateClosedSelfHashedArtifactV5R10,
} from "./schema-contract-v5-r10.mjs";

const COLLECTION_FIELDS = Object.freeze([
  "requestArtifacts",
  "dispatchAudits",
  "semanticDispatchAuthorities",
  "dispatchPermits",
  "compatibilityDispatchPermits",
  "rawResponseArtifacts",
  "rawResponseBindingReceipts",
  "attemptCommitIntents",
  "resolvedAttemptReceipts",
]);

function root(values) {
  return sha256V5R3(canonicalJsonV5R3([...values].sort()));
}

function expectedHashesByCollection(roleEvidence, input) {
  const auditHashes = new Set(roleEvidence.map(({ dispatchAuditHash }) => dispatchAuditHash));
  const suppliedSemantic = new Set((input.semanticDispatchAuthorities ?? []).map(({ selfHash }) => selfHash));
  return {
    requestArtifacts: roleEvidence.map(({ requestArtifactHash }) => requestArtifactHash),
    dispatchAudits: [...auditHashes],
    semanticDispatchAuthorities: roleEvidence.map(({ semanticDispatchAuthorityHash }) =>
      semanticDispatchAuthorityHash).filter((value) => value !== null
        && suppliedSemantic.has(value) && !auditHashes.has(value)),
    dispatchPermits: roleEvidence.map(({ dispatchPermitHash }) => dispatchPermitHash),
    compatibilityDispatchPermits: roleEvidence.map(({ compatibilityDispatchPermitHash }) =>
      compatibilityDispatchPermitHash),
    rawResponseArtifacts: roleEvidence.map(({ rawResponseArtifactHash }) => rawResponseArtifactHash),
    rawResponseBindingReceipts: roleEvidence.map(({ rawResponseBindingReceiptHash }) =>
      rawResponseBindingReceiptHash),
    attemptCommitIntents: roleEvidence.map(({ attemptCommitIntentHash }) => attemptCommitIntentHash),
    resolvedAttemptReceipts: roleEvidence.map(({ resolvedAttemptReceiptHash }) =>
      resolvedAttemptReceiptHash),
  };
}

function suppliedIdentity(collection, value) {
  if (collection === "requestArtifacts") return value?.selfHash;
  return value?.selfHash;
}

function exactCollectionErrors(input, roleEvidence) {
  const errors = [];
  const expected = expectedHashesByCollection(roleEvidence, input);
  const cardinalities = {};
  for (const collection of COLLECTION_FIELDS) {
    const values = Array.isArray(input[collection]) ? input[collection] : [];
    const supplied = values.map((value) => suppliedIdentity(collection, value));
    const expectedValues = expected[collection] ?? [];
    cardinalities[collection] = Object.freeze({ supplied: supplied.length,
      expectedReferenced: expectedValues.length });
    if (supplied.some((value) => typeof value !== "string")
      || new Set(supplied).size !== supplied.length) {
      errors.push(`${collection}: supplied identities are absent or duplicated`);
      continue;
    }
    const suppliedSorted = [...supplied].sort();
    const expectedSorted = [...new Set(expectedValues)].sort();
    if (canonicalJsonV5R3(suppliedSorted) !== canonicalJsonV5R3(expectedSorted)) {
      const dangling = suppliedSorted.filter((value) => !expectedSorted.includes(value));
      const absent = expectedSorted.filter((value) => !suppliedSorted.includes(value));
      if (dangling.length > 0) errors.push(`${collection}: ${dangling.length} dangling unreferenced artifact(s)`);
      if (absent.length > 0) errors.push(`${collection}: ${absent.length} referenced artifact(s) absent`);
      if (dangling.length === 0 && absent.length === 0) {
        errors.push(`${collection}: supplied and referenced multiplicity differs`);
      }
    }
  }
  return { errors, cardinalities };
}

export function reconstructAttemptGraphV5R10(input) {
  let base;
  const wrapperErrors = [];
  try {
    base = reconstructAttemptGraphCoreV5R10(input);
  } catch (error) {
    wrapperErrors.push(error instanceof Error ? error.message : String(error));
    base = { receipt: {
      ledgerEntryRootHash: root((input.ledgerEntries ?? []).map(({ selfHash }) => selfHash)),
      ledgerTerminalHash: input.ledgerEntries?.at(-1)?.selfHash ?? null,
      reservationCount: (input.ledgerEntries ?? []).filter(({ entryType }) =>
        entryType === "DISPATCH_RESERVED").length,
      completionCount: (input.ledgerEntries ?? []).filter(({ entryType }) =>
        entryType === "DISPATCH_COMPLETED").length,
      successfulAttemptCount: 0,
      failedAttemptCount: 0,
      activeReservationCount: 0,
      rawReparseFailureCount: 0,
      roleAttemptEvidenceReceipts: [],
      lineageErrors: [],
    }, roleAttemptEvidenceReceipts: [] };
  }
  const roleEvidence = base.roleAttemptEvidenceReceipts ?? [];
  const exact = exactCollectionErrors(input, roleEvidence);
  const lineageErrors = [...new Set([...(base.receipt.lineageErrors ?? []),
    ...wrapperErrors, ...exact.errors])].sort();
  const allExact = lineageErrors.length === 0
    && base.receipt.graphStatus === "COMPLETE_VALID"
    && exact.errors.length === 0;
  const receipt = assertClosedSelfHashedArtifactV5R10(sealV5R3Artifact({
    schemaVersion: "AttemptGraphReconstructionReceiptV2",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash: input.activeRegistration.selfHash,
    authorizationHash: input.authorization.selfHash,
    sampleExecutionInventoryHash: input.inventory.selfHash,
    provider: input.authorization.provider,
    ledgerEntryRootHash: base.receipt.ledgerEntryRootHash,
    ledgerTerminalHash: base.receipt.ledgerTerminalHash,
    requestArtifactRootHash: root((input.requestArtifacts ?? []).map(({ selfHash }) => selfHash)),
    dispatchAuditRootHash: root((input.dispatchAudits ?? []).map(({ selfHash }) => selfHash)),
    semanticDispatchAuthorityRootHash: root((input.semanticDispatchAuthorities ?? [])
      .map(({ selfHash }) => selfHash)),
    dispatchPermitRootHash: root((input.dispatchPermits ?? []).map(({ selfHash }) => selfHash)),
    compatibilityDispatchPermitRootHash: root((input.compatibilityDispatchPermits ?? [])
      .map(({ selfHash }) => selfHash)),
    rawResponseArtifactRootHash: root((input.rawResponseArtifacts ?? []).map(({ selfHash }) => selfHash)),
    rawResponseBindingRootHash: root((input.rawResponseBindingReceipts ?? []).map(({ selfHash }) => selfHash)),
    attemptCommitIntentRootHash: root((input.attemptCommitIntents ?? []).map(({ selfHash }) => selfHash)),
    resolvedAttemptReceiptRootHash: root((input.resolvedAttemptReceipts ?? []).map(({ selfHash }) => selfHash)),
    roleAttemptEvidenceRootHash: root(roleEvidence.map(({ selfHash }) => selfHash)),
    roleAttemptEvidenceReceipts: roleEvidence,
    evidenceCollectionCardinalities: exact.cardinalities,
    bidirectionalSetEqualityVerified: allExact,
    reservationCount: base.receipt.reservationCount,
    completionCount: base.receipt.completionCount,
    resolvedAttemptCount: input.resolvedAttemptReceipts?.length ?? 0,
    successfulAttemptCount: base.receipt.successfulAttemptCount,
    failedAttemptCount: base.receipt.failedAttemptCount,
    activeReservationCount: base.receipt.activeReservationCount,
    rawReparseFailureCount: base.receipt.rawReparseFailureCount,
    danglingEvidenceCount: exact.errors.filter((error) => error.includes("dangling")).length,
    lineageErrorCount: lineageErrors.length,
    lineageErrors,
    graphStatus: allExact ? "COMPLETE_VALID" : "INCOMPLETE_INVALID",
    derivedAt: input.derivedAt,
  }), "AttemptGraphReconstructionReceiptV2");
  return Object.freeze({ receipt, roleAttemptEvidenceReceipts: Object.freeze([...roleEvidence]) });
}

export { roleOutputByEvidenceV5R10 };

export function validateAttemptGraphReconstructionReceiptV5R10({ attemptGraphReceipt, ...input }) {
  const errors = [];
  errors.push(...validateClosedSelfHashedArtifactV5R10(attemptGraphReceipt,
    "AttemptGraphReconstructionReceiptV2"));
  try {
    const rebuilt = reconstructAttemptGraphV5R10({ ...input, derivedAt: attemptGraphReceipt?.derivedAt });
    if (canonicalJsonV5R3(rebuilt.receipt) !== canonicalJsonV5R3(attemptGraphReceipt)) {
      errors.push("R10 attempt graph differs from exact bidirectional evidence reconstruction");
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return Object.freeze([...new Set(errors)]);
}

export const ATTEMPT_GRAPH_V5_R10_CONSTANTS = Object.freeze({
  exactBidirectionalSetEqualityCollections: COLLECTION_FIELDS,
  danglingEvidenceAccepted: false,
  rawResponseIsAuthoritative: true,
});
