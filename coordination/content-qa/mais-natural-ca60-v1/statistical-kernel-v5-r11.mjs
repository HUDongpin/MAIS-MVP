import { createHash } from "node:crypto";

import DESIGN from "../../research/mais-natural-ca60-v1/versions/design-v5/design-registration.json" with { type: "json" };
import {
  TAXONOMY,
  TAXONOMY_FAMILY,
} from "../../research/mais-natural-ca60-v1/versions/design-v2/design-contract.mjs";

import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
  validateSelfHashV5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  assertClosedSelfHashedArtifactV5R11,
  validateClosedSelfHashedArtifactV5R11,
} from "./schema-contract-v5-r11.mjs";

const DESIGN_ID = "MAIS-NATURAL-CA60-V5";
const EXPECTED_ITEM_COUNT = 60;
const BOOTSTRAP_REPLICATES = 10_000;
const ONE_SIDED_Z95 = 1.6448536269514722;
const TWO_SIDED_Z95 = 1.959963984540054;
const HASH = /^[0-9a-f]{64}$/u;
const STATUS_CODES = new Set(["NO_FINDING", "UNASSESSABLE", "SCHEMA_GAP"]);
const FROZEN_CODE_ORDER = Object.freeze(Object.keys(TAXONOMY));

const SURFACE_ENUMERATION_METHOD =
  "EXACT_FEASIBLE_SURFACE_WORLD_ENUMERATION_WITH_ONE_SIDED_95_WILSON_PER_WORLD";
const FINDING_ADVERSE_METHOD =
  "SEALED_RESOLVED_REFERENCE_FINDING_COUNTS_WITH_MACHINE_SIDE_ADVERSE_ASSIGNMENT_AND_ONE_SIDED_95_WILSON";
const FINDING_UNIDENTIFIED_METHOD =
  "UNRESOLVED_OR_INVALID_REFERENCE_FINDING_ESTIMAND_UNIDENTIFIED_BOUND_0_1";
const INTEGRITY_LIMIT_METHOD = "INTEGRITY_LIMIT_EXCEEDED_NO_DECISION_BOUND";

export const BOOTSTRAP_GOLDEN_VECTORS_V5_R11 = Object.freeze(
  DESIGN.analysis.confidenceIntervals.bootstrapGoldenVectors.map((value) => Object.freeze({ ...value })),
);

const METRIC_RULES = Object.freeze({
  SURFACE_SENSITIVITY: Object.freeze({ direction: "MINIMUM", threshold: 0.90,
    minimumN: 25, decisionEligible: true, bootstrap: false }),
  SPECIFICITY: Object.freeze({ direction: "MINIMUM", threshold: 0.95,
    minimumN: 52, decisionEligible: true, bootstrap: false }),
  FALSE_POSITIVE_RATE: Object.freeze({ direction: "MAXIMUM", threshold: 0.05,
    minimumN: 52, decisionEligible: true, bootstrap: false }),
  FAMILY_RECALL: Object.freeze({ direction: "MINIMUM", threshold: 0.85,
    minimumN: 16, decisionEligible: true, bootstrap: true }),
  EXACT_CODE_AND_FAMILY_RECALL: Object.freeze({ direction: "MINIMUM", threshold: 0.85,
    minimumN: 16, decisionEligible: true, bootstrap: true }),
  FAMILY_PRECISION: Object.freeze({ direction: "DESCRIPTIVE", threshold: null,
    minimumN: 0, decisionEligible: false, bootstrap: true }),
  EXACT_CODE_PRECISION: Object.freeze({ direction: "DESCRIPTIVE", threshold: null,
    minimumN: 0, decisionEligible: false, bootstrap: true }),
  P1_RECALL: Object.freeze({ direction: "MINIMUM", threshold: 0.90,
    minimumN: 25, decisionEligible: true, bootstrap: true }),
  P2_MISSED_OR_UNRESOLVED_RATE: Object.freeze({ direction: "MAXIMUM", threshold: 0.10,
    minimumN: 25, decisionEligible: true, bootstrap: true }),
  P0_FALSE_NEGATIVE_COUNT: Object.freeze({ direction: "OBSERVED_ZERO_COUNT", threshold: 0,
    minimumN: 59, decisionEligible: true, bootstrap: false }),
});

function requireCondition(condition, message) {
  if (!condition) throw new TypeError(message);
}

function plainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function codePointCompare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function iso(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function unique(values) {
  return [...new Set(values)];
}

function root(values) {
  return sha256V5R3(canonicalJsonV5R3(values));
}

function artifactBody(artifact) {
  const { selfHash: _selfHash, ...body } = artifact;
  return body;
}

export function bootstrapBoundedIndexV5R11({ key, metric, replicate, draw, bound }) {
  requireCondition(typeof key === "string" && key.length > 0 && !key.includes("|"),
    "R11 bootstrap key must be nonempty and pipe-free");
  requireCondition(typeof metric === "string" && metric.length > 0 && !metric.includes("|"),
    "R11 bootstrap metric must be nonempty and pipe-free");
  requireCondition([replicate, draw, bound].every(Number.isSafeInteger)
    && replicate >= 0 && draw >= 0 && bound > 0, "R11 bootstrap index inputs are invalid");
  const range = 1n << 64n;
  const upperExclusive = range - (range % BigInt(bound));
  for (let rejection = 0; ; rejection += 1) {
    const digest = createHash("sha256")
      .update(`${key}|${metric}|${replicate}|${draw}|${rejection}`, "utf8").digest();
    const value = digest.readBigUInt64BE(0);
    if (value < upperExclusive) return Number(value % BigInt(bound));
  }
}

function assertGoldenVectors() {
  requireCondition(BOOTSTRAP_GOLDEN_VECTORS_V5_R11.every((vector) =>
    bootstrapBoundedIndexV5R11(vector) === vector.expectedIndex),
  "R11 counter-SHA256 bootstrap golden vectors failed");
}

export function wilsonIntervalV5R11(numerator, denominator, z) {
  requireCondition(Number.isInteger(numerator) && Number.isInteger(denominator)
    && numerator >= 0 && denominator >= 0 && numerator <= denominator
    && Number.isFinite(z) && z > 0, "R11 Wilson inputs are invalid");
  if (denominator === 0) return Object.freeze({ lower: null, upper: null });
  const proportion = numerator / denominator;
  const zSquared = z * z;
  const adjustment = 1 + zSquared / denominator;
  const center = (proportion + zSquared / (2 * denominator)) / adjustment;
  const halfWidth = z * Math.sqrt((proportion * (1 - proportion)
    + zSquared / (4 * denominator)) / denominator) / adjustment;
  return Object.freeze({ lower: Math.max(0, center - halfWidth),
    upper: Math.min(1, center + halfWidth) });
}

function normalizeFinding(finding, itemId, stream, globalKeys) {
  requireCondition(plainObject(finding) && finding.itemId === itemId
    && typeof finding.findingId === "string" && finding.findingId.length > 0
    && typeof finding.evidenceLocator === "string" && finding.evidenceLocator.length > 0
    && Object.hasOwn(TAXONOMY, finding.code) && !STATUS_CODES.has(finding.code)
    && finding.family === TAXONOMY_FAMILY[finding.code]
    && finding.severity === TAXONOMY[finding.code],
  `R11 ${stream} finding is not a frozen taxonomy leaf for ${itemId}`);
  const frozenCompositeKey = `${itemId}|${finding.findingId}|${finding.family}|${finding.code}`;
  requireCondition(!globalKeys.has(frozenCompositeKey),
    `R11 ${stream} frozen composite finding key ${frozenCompositeKey} is duplicated`);
  globalKeys.add(frozenCompositeKey);
  return Object.freeze({
    itemId,
    findingId: finding.findingId,
    evidenceLocator: finding.evidenceLocator,
    code: finding.code,
    family: finding.family,
    severity: finding.severity,
  });
}

function findingSort(left, right) {
  return FROZEN_CODE_ORDER.indexOf(left.code) - FROZEN_CODE_ORDER.indexOf(right.code)
    || codePointCompare(left.family, right.family)
    || codePointCompare(left.findingId, right.findingId);
}

export function deterministicFindingMatchesV5R11(referenceFindings, machineFindings) {
  const itemIds = unique([...(referenceFindings ?? []), ...(machineFindings ?? [])]
    .map(({ itemId }) => itemId));
  requireCondition(itemIds.length === 1 && typeof itemIds[0] === "string",
    "R11 finding matching requires exactly one item pseudonym");
  const reference = [...referenceFindings].sort(findingSort);
  const machine = [...machineFindings].sort(findingSort);
  const usedReference = new Set();
  const usedMachine = new Set();
  const matches = [];
  for (const matchType of ["EXACT_CODE_AND_FAMILY", "FAMILY_ONLY"]) {
    for (let referenceIndex = 0; referenceIndex < reference.length; referenceIndex += 1) {
      if (usedReference.has(referenceIndex)) continue;
      const referenceFinding = reference[referenceIndex];
      const machineIndex = machine.findIndex((machineFinding, index) => !usedMachine.has(index)
        && machineFinding.family === referenceFinding.family
        && (matchType === "FAMILY_ONLY" || machineFinding.code === referenceFinding.code));
      if (machineIndex < 0) continue;
      const machineFinding = machine[machineIndex];
      usedReference.add(referenceIndex);
      usedMachine.add(machineIndex);
      matches.push(Object.freeze({
        itemId: itemIds[0],
        family: referenceFinding.family,
        referenceCode: referenceFinding.code,
        machineCode: machineFinding.code,
        matchType,
        referenceFindingId: referenceFinding.findingId,
        machineFindingId: machineFinding.findingId,
        referenceEvidenceLocator: referenceFinding.evidenceLocator,
        machineEvidenceLocator: machineFinding.evidenceLocator,
        referenceKey: `${itemIds[0]}|${referenceFinding.findingId}|${referenceFinding.family}|${referenceFinding.code}`,
        machineKey: `${itemIds[0]}|${machineFinding.findingId}|${machineFinding.family}|${machineFinding.code}`,
      }));
    }
  }
  matches.sort((left, right) => codePointCompare(left.referenceKey, right.referenceKey)
    || codePointCompare(left.machineKey, right.machineKey));
  return Object.freeze({
    matches: Object.freeze(matches),
    unmatchedReference: Object.freeze(reference.filter((_, index) => !usedReference.has(index))),
    unmatchedMachine: Object.freeze(machine.filter((_, index) => !usedMachine.has(index))),
  });
}

function validateItemResult(item, index, expected, globalReferenceKeys, globalMachineKeys) {
  const schemaErrors = validateClosedSelfHashedArtifactV5R11(item, "ItemEvaluationResultV2");
  requireCondition(schemaErrors.length === 0 && validateSelfHashV5R3(item)
    && item.schemaVersion === "ItemEvaluationResultV2" && item.designId === DESIGN_ID,
  `R11 item result ${index + 1} is not a closed sealed ItemEvaluationResultV2: ${schemaErrors.join("; ")}`);
  requireCondition(item.manifestOrdinal === index + 1 && HASH.test(item.itemHash ?? "")
    && typeof item.itemIdPseudonym === "string" && item.itemIdPseudonym.length > 0
    && typeof item.clusterId === "string" && item.clusterId.length > 0,
  `R11 item result ${index + 1} identity is invalid`);
  for (const [field, value] of Object.entries({
    runnerRegistrationHash: expected.activeRunnerRegistrationHash,
    sampleExecutionInventoryHash: expected.sampleExecutionInventoryHash,
    referenceSealHash: expected.referenceSealHash,
    executionRegistrationHash: expected.executionRegistrationHash,
    deepSeekAuthorizationHash: expected.deepSeekAuthorizationHash,
    c0ExecutionSetHash: expected.c0ExecutionSetHash,
  })) requireCondition(item[field] === value, `R11 item result ${index + 1} ${field} binding differs`);
  requireCondition(["COMPLETE", "MISSING_RECEIPT"].includes(item.executionDisposition)
    && ["RESOLVED", "UNRESOLVED_MACHINE", "MISSING_RECEIPT"].includes(item.machineDisposition)
    && ["RESOLVED_POSITIVE", "RESOLVED_NEGATIVE", "UNRESOLVED_REFERENCE", "INVALID"]
      .includes(item.referenceDisposition), `R11 item result ${index + 1} disposition is invalid`);
  const complete = item.executionDisposition === "COMPLETE";
  requireCondition((complete && ["RESOLVED", "UNRESOLVED_MACHINE"].includes(item.machineDisposition))
    || (!complete && item.machineDisposition === "MISSING_RECEIPT"),
  `R11 item result ${index + 1} execution and machine dispositions conflict`);
  requireCondition((complete && HASH.test(item.completedItemMarkerHash ?? ""))
    || (!complete && item.completedItemMarkerHash === null),
  `R11 item result ${index + 1} completion marker binding is invalid`);
  requireCondition(Array.isArray(item.referenceFindings) && Array.isArray(item.machineFindings),
    `R11 item result ${index + 1} finding arrays are absent`);
  const referenceFindings = item.referenceFindings
    .map((finding) => normalizeFinding(finding, item.itemIdPseudonym, "reference", globalReferenceKeys))
    .sort(findingSort);
  const machineFindings = item.machineFindings
    .map((finding) => normalizeFinding(finding, item.itemIdPseudonym, "machine", globalMachineKeys))
    .sort(findingSort);
  requireCondition((item.referenceDisposition === "RESOLVED_POSITIVE") === (referenceFindings.length > 0)
    || ["UNRESOLVED_REFERENCE", "INVALID"].includes(item.referenceDisposition),
  `R11 item result ${index + 1} reference surface and findings conflict`);
  requireCondition(item.referenceDisposition !== "RESOLVED_NEGATIVE" || referenceFindings.length === 0,
    `R11 item result ${index + 1} resolved-negative reference contains findings`);
  const machineResolved = complete && item.machineDisposition === "RESOLVED";
  requireCondition(!machineResolved ? item.machineSurfaceFinding === null && machineFindings.length === 0
    : item.machineSurfaceFinding === (machineFindings.length > 0),
  `R11 item result ${index + 1} machine resolution, surface, and findings conflict`);
  return Object.freeze({ item, complete, machineResolved, referenceFindings, machineFindings });
}

function buildObservedLedger(input) {
  requireCondition(Array.isArray(input.itemResults) && input.itemResults.length === EXPECTED_ITEM_COUNT,
    "R11 statistical analysis requires exactly 60 sealed item results, including missing-receipt rows");
  const globalReferenceKeys = new Set();
  const globalMachineKeys = new Set();
  const validated = input.itemResults.map((item, index) => validateItemResult(item, index, input,
    globalReferenceKeys, globalMachineKeys));
  requireCondition(new Set(validated.map(({ item }) => item.itemHash)).size === EXPECTED_ITEM_COUNT
    && new Set(validated.map(({ item }) => item.itemIdPseudonym)).size === EXPECTED_ITEM_COUNT
    && new Set(validated.map(({ item }) => item.clusterId)).size === EXPECTED_ITEM_COUNT,
  "R11 item hashes, pseudonyms, and homology clusters must each be unique across all 60 rows");

  const accounting = {
    expectedSampleSize: EXPECTED_ITEM_COUNT,
    completeReceiptItemCount: 0,
    missingReceiptItemCount: 0,
    resolvedPositiveItemCount: 0,
    resolvedNegativeItemCount: 0,
    unresolvedReferenceItemCount: 0,
    invalidItemCount: 0,
    unifiedNonresolvedItemCount: 0,
  };
  const confusionMatrix = { tp: 0, fp: 0, fn: 0, tn: 0 };
  const matchRecords = [];
  const unmatchedReference = [];
  const unmatchedMachine = [];
  const contributions = [];

  for (const record of validated) {
    const { item, complete, machineResolved, referenceFindings, machineFindings } = record;
    if (complete) accounting.completeReceiptItemCount += 1;
    else accounting.missingReceiptItemCount += 1;
    const referenceResolved = ["RESOLVED_POSITIVE", "RESOLVED_NEGATIVE"]
      .includes(item.referenceDisposition);
    const analysisResolved = complete && machineResolved && referenceResolved;
    if (analysisResolved && item.referenceDisposition === "RESOLVED_POSITIVE") {
      accounting.resolvedPositiveItemCount += 1;
      if (item.machineSurfaceFinding) confusionMatrix.tp += 1;
      else confusionMatrix.fn += 1;
    } else if (analysisResolved && item.referenceDisposition === "RESOLVED_NEGATIVE") {
      accounting.resolvedNegativeItemCount += 1;
      if (item.machineSurfaceFinding) confusionMatrix.fp += 1;
      else confusionMatrix.tn += 1;
    }

    // Exactly one bucket per item: missing wins, then unresolved reference,
    // then invalid reference or machine nonresolution, then resolved polarity.
    if (!complete) {
      // missingReceiptItemCount already owns the row
    } else if (item.referenceDisposition === "UNRESOLVED_REFERENCE") {
      accounting.unresolvedReferenceItemCount += 1;
    } else if (item.referenceDisposition === "INVALID" || !machineResolved) {
      accounting.invalidItemCount += 1;
    }

    let matching = { matches: [], unmatchedReference: [], unmatchedMachine: [] };
    if (analysisResolved && item.referenceDisposition === "RESOLVED_POSITIVE") {
      matching = deterministicFindingMatchesV5R11(referenceFindings, machineFindings);
    } else if (analysisResolved && item.referenceDisposition === "RESOLVED_NEGATIVE") {
      matching = { matches: [], unmatchedReference: [], unmatchedMachine: machineFindings };
    }
    matchRecords.push(...matching.matches);
    unmatchedReference.push(...matching.unmatchedReference);
    unmatchedMachine.push(...matching.unmatchedMachine);
    contributions.push(Object.freeze({
      itemId: item.itemIdPseudonym,
      itemHash: item.itemHash,
      clusterId: item.clusterId,
      complete,
      machineDisposition: item.machineDisposition,
      machineResolved,
      analysisResolved,
      referenceDisposition: item.referenceDisposition,
      machineSurfaceFinding: item.machineSurfaceFinding,
      referenceFindings,
      machineFindings,
      matches: Object.freeze([...matching.matches]),
      unmatchedReference: Object.freeze([...matching.unmatchedReference]),
      unmatchedMachine: Object.freeze([...matching.unmatchedMachine]),
    }));
  }
  accounting.unifiedNonresolvedItemCount = accounting.missingReceiptItemCount
    + accounting.unresolvedReferenceItemCount + accounting.invalidItemCount;
  requireCondition(accounting.completeReceiptItemCount + accounting.missingReceiptItemCount
    === EXPECTED_ITEM_COUNT, "R11 complete and missing receipt accounting does not equal 60");
  requireCondition(accounting.resolvedPositiveItemCount + accounting.resolvedNegativeItemCount
    + accounting.unresolvedReferenceItemCount + accounting.invalidItemCount
    === accounting.completeReceiptItemCount,
  "R11 complete item accounting is not a disjoint partition");

  const exactMatches = matchRecords.filter(({ matchType }) => matchType === "EXACT_CODE_AND_FAMILY");
  const observed = contributions.filter(({ analysisResolved }) => analysisResolved);
  const referenceFindingCount = observed.reduce((sum, row) => sum + row.referenceFindings.length, 0);
  const machineFindingCount = observed.reduce((sum, row) => sum + row.machineFindings.length, 0);
  const p0ReferenceCount = observed.reduce((sum, row) => sum
    + row.referenceFindings.filter(({ severity }) => severity === "P0").length, 0);
  const p0FalseNegativeCount = unmatchedReference.filter(({ severity }) => severity === "P0").length;
  const p0OpportunityItemCount = observed.filter((row) => row.referenceFindings
    .some(({ severity }) => severity === "P0")).length;
  const p0FalseNegativeItemCount = observed.filter((row) => row.unmatchedReference
    .some(({ severity }) => severity === "P0")).length;
  const p1ReferenceCount = observed.reduce((sum, row) => sum
    + row.referenceFindings.filter(({ severity }) => severity === "P1").length, 0);
  const p1MatchedCount = matchRecords.filter(({ referenceCode }) => TAXONOMY[referenceCode] === "P1").length;
  const p1OpportunityItemCount = observed.filter((row) => row.referenceFindings
    .some(({ severity }) => severity === "P1")).length;
  const p2ReferenceCount = observed.reduce((sum, row) => sum
    + row.referenceFindings.filter(({ severity }) => severity === "P2").length, 0);
  const p2MissedCount = unmatchedReference.filter(({ severity }) => severity === "P2").length;
  const p2OpportunityItemCount = observed.filter((row) => row.referenceFindings
    .some(({ severity }) => severity === "P2")).length;
  const body = {
    schemaVersion: "ObservedEvaluationLedgerV2",
    designId: DESIGN_ID,
    activeRunnerRegistrationHash: input.activeRunnerRegistrationHash,
    sampleExecutionInventoryHash: input.sampleExecutionInventoryHash,
    referenceSealHash: input.referenceSealHash,
    executionRegistrationHash: input.executionRegistrationHash,
    itemResultSetHash: root(input.itemResults.map(({ manifestOrdinal, itemHash, clusterId, selfHash }) =>
      [manifestOrdinal, itemHash, clusterId, selfHash])),
    accounting,
    confusionMatrix,
    findingCounts: {
      referenceFindingCount,
      machineFindingCount,
      familyMatchedReferenceCount: matchRecords.length,
      exactMatchedReferenceCount: exactMatches.length,
      familyMatchedMachineCount: matchRecords.length,
      exactMatchedMachineCount: exactMatches.length,
      unmatchedReferenceCount: unmatchedReference.length,
      unmatchedMachineCount: unmatchedMachine.length,
      p0ReferenceCount,
      p0FalseNegativeCount,
      p0OpportunityItemCount,
      p0FalseNegativeItemCount,
      p1ReferenceCount,
      p1MatchedCount,
      p1OpportunityItemCount,
      p2ReferenceCount,
      p2MissedCount,
      p2OpportunityItemCount,
      familyOpportunityItemCount: observed.filter((row) => row.referenceFindings.length > 0).length,
      precisionOpportunityItemCount: observed.filter((row) => row.machineFindings.length > 0).length,
    },
    matchRecords,
    contributions,
  };
  return assertClosedSelfHashedArtifactV5R11(sealV5R3Artifact(body),
    "ObservedEvaluationLedgerV2");
}

function surfaceClassification(referencePositive, machinePositive) {
  if (referencePositive) return machinePositive ? "TP" : "FN";
  return machinePositive ? "FP" : "TN";
}

function enumerateSurfaceWorlds(confusionMatrix, nonresolvedItems) {
  const ordered = [...nonresolvedItems].sort((left, right) => codePointCompare(left.itemId, right.itemId));
  let worlds = [{ assignments: [], confusionMatrix: structuredClone(confusionMatrix) }];
  for (const item of ordered) {
    const machines = item.observedMachineSurfacePrediction === null
      ? [false, true] : [item.observedMachineSurfacePrediction];
    const references = item.sealedReferenceDisposition === "RESOLVED_POSITIVE" ? [true]
      : item.sealedReferenceDisposition === "RESOLVED_NEGATIVE" ? [false] : [false, true];
    worlds = worlds.flatMap((world) => machines.flatMap((machinePositive) => references.map((referencePositive) => {
      const classification = surfaceClassification(referencePositive, machinePositive);
      const nextMatrix = structuredClone(world.confusionMatrix);
      nextMatrix[classification.toLowerCase()] += 1;
      return {
        assignments: [...world.assignments, {
          itemId: item.itemId,
          clusterId: item.clusterId,
          reason: item.reason,
          observedMachineSurfacePrediction: item.observedMachineSurfacePrediction,
          assignedMachineSurfaceFinding: machinePositive,
          assignedReferenceDisposition: referencePositive ? "RESOLVED_POSITIVE" : "RESOLVED_NEGATIVE",
          classification,
        }],
        confusionMatrix: nextMatrix,
      };
    })));
  }
  return worlds.map((world, worldIndex) => Object.freeze({ worldIndex, ...world }));
}

function buildCounterfactualLedger(observed) {
  const nonresolvedItems = observed.contributions.filter(({ analysisResolved }) => !analysisResolved)
    .map((row) => Object.freeze({
      itemId: row.itemId,
      clusterId: row.clusterId,
      reason: !row.complete ? "MISSING_RECEIPT"
        : ["UNRESOLVED_REFERENCE", "INVALID"].includes(row.referenceDisposition)
          ? row.referenceDisposition : "UNRESOLVED_MACHINE",
      sealedReferenceDisposition: row.referenceDisposition,
      observedMachineSurfacePrediction: row.machineResolved ? row.machineSurfaceFinding : null,
      sealedReferenceFindingCount: row.referenceFindings.length,
      sealedP1ReferenceFindingCount: row.referenceFindings
        .filter(({ severity }) => severity === "P1").length,
      sealedP2ReferenceFindingCount: row.referenceFindings
        .filter(({ severity }) => severity === "P2").length,
    }));
  const integrityLimitExceeded = nonresolvedItems.length > 3;
  const referenceUnidentified = nonresolvedItems.filter(({ sealedReferenceDisposition }) =>
    ["UNRESOLVED_REFERENCE", "INVALID"].includes(sealedReferenceDisposition));
  const machineNonresolvedResolvedReference = nonresolvedItems.filter((row) =>
    row.observedMachineSurfacePrediction === null
    && ["RESOLVED_POSITIVE", "RESOLVED_NEGATIVE"].includes(row.sealedReferenceDisposition));
  const findingDecisionBoundUnidentified = referenceUnidentified.length > 0;
  const maximumAdverseFindingOpportunityAdditions = findingDecisionBoundUnidentified ? {
    familyRecall: null,
    exactCodeAndFamilyRecall: null,
    p1Recall: null,
    p2MissedOrUnresolved: null,
  } : {
    familyRecall: machineNonresolvedResolvedReference.reduce((sum, row) =>
      sum + row.sealedReferenceFindingCount, 0),
    exactCodeAndFamilyRecall: machineNonresolvedResolvedReference.reduce((sum, row) =>
      sum + row.sealedReferenceFindingCount, 0),
    p1Recall: machineNonresolvedResolvedReference.reduce((sum, row) =>
      sum + row.sealedP1ReferenceFindingCount, 0),
    p2MissedOrUnresolved: machineNonresolvedResolvedReference.reduce((sum, row) =>
      sum + row.sealedP2ReferenceFindingCount, 0),
  };
  const surfaceWorlds = integrityLimitExceeded ? []
    : enumerateSurfaceWorlds(observed.confusionMatrix, nonresolvedItems);
  return assertClosedSelfHashedArtifactV5R11(sealV5R3Artifact({
    schemaVersion: "CounterfactualLedgerV2",
    designId: DESIGN_ID,
    activeRunnerRegistrationHash: observed.activeRunnerRegistrationHash,
    observedItemResultSetHash: observed.itemResultSetHash,
    observedConfusionMatrix: observed.confusionMatrix,
    observedFindingCounts: observed.findingCounts,
    nonresolvedItems,
    nonresolvedItemCount: nonresolvedItems.length,
    referenceUnidentifiedItemCount: referenceUnidentified.length,
    machineNonresolvedResolvedReferenceItemCount: machineNonresolvedResolvedReference.length,
    findingDecisionBoundUnidentified,
    findingDecisionBound: findingDecisionBoundUnidentified ? { lower: 0, upper: 1 } : null,
    integrityLimitExceeded,
    maximumAdverseFindingOpportunityAdditions,
    surfaceWorlds,
    surfaceAssignmentCount: surfaceWorlds.length,
    surfaceEnumerationDisposition: integrityLimitExceeded
      ? "NOT_ENUMERATED_UNIFIED_NONRESOLVED_LIMIT_EXCEEDED"
      : "ENUMERATED_WITHIN_UNIFIED_NONRESOLVED_LIMIT",
    surfaceEnumerationRule: DESIGN.analysis.missingData.surfaceCounterfactualEnumerationRule,
    p0MissingFalseNegativesFabricated: 0,
    p0Rule: "OBSERVED_FALSE_NEGATIVES_ONLY",
    counterfactualLedgerSeparateFromObservedCounts: true,
  }), "CounterfactualLedgerV2");
}

function deriveExecutionIntegrity(input, observed) {
  const errors = [];
  const accounting = observed.accounting;
  if (accounting.completeReceiptItemCount < 57) errors.push("COMPLETE_ITEM_RECEIPTS_BELOW_57");
  if (accounting.unifiedNonresolvedItemCount > 3) errors.push("UNRESOLVED_OR_INVALID_ABOVE_3");
  if (input.receiptChainValid !== true) errors.push("RECEIPT_CHAIN_UNVERIFIABLE");
  if (input.providerTupleValid !== true) errors.push("PROVIDER_ORIGIN_OR_MODEL_DRIFT");
  if (input.capsValid !== true) errors.push("TOKEN_ATTEMPT_OR_USD_CAP_EXCEEDED");
  if (input.terminalProviderFailure !== false) {
    errors.push("PROVIDER_OR_NETWORK_FAILURE_PREVENTS_FROZEN_COMPLETION");
  }
  return Object.freeze({
    status: errors.length === 0 ? "INTACT" : "FAILED",
    totalNonresolvedItemCount: accounting.unifiedNonresolvedItemCount,
    causeCodes: Object.freeze(unique(errors)),
  });
}

function percentileType7(sorted, probability) {
  if (sorted.length === 0) return null;
  if (sorted.length === 1) return sorted[0];
  const position = (sorted.length - 1) * probability;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return sorted[lower] + (position - lower) * (sorted[upper] - sorted[lower]);
}

function perItemContribution(row, metric) {
  if (!row.analysisResolved) return { numerator: 0, denominator: 0 };
  const exact = row.matches.filter(({ matchType }) => matchType === "EXACT_CODE_AND_FAMILY");
  if (metric === "FAMILY_RECALL") return { numerator: row.matches.length,
    denominator: row.referenceFindings.length };
  if (metric === "EXACT_CODE_AND_FAMILY_RECALL") return { numerator: exact.length,
    denominator: row.referenceFindings.length };
  if (metric === "FAMILY_PRECISION") return { numerator: row.matches.length,
    denominator: row.machineFindings.length };
  if (metric === "EXACT_CODE_PRECISION") return { numerator: exact.length,
    denominator: row.machineFindings.length };
  if (metric === "P1_RECALL") return {
    numerator: row.matches.filter(({ referenceCode }) => TAXONOMY[referenceCode] === "P1").length,
    denominator: row.referenceFindings.filter(({ severity }) => severity === "P1").length,
  };
  if (metric === "P2_MISSED_OR_UNRESOLVED_RATE") return {
    numerator: row.unmatchedReference.filter(({ severity }) => severity === "P2").length,
    denominator: row.referenceFindings.filter(({ severity }) => severity === "P2").length,
  };
  throw new TypeError(`R11 unsupported bootstrap metric ${metric}`);
}

function bootstrapBounds(observed, metric, direction) {
  const contributions = observed.contributions.map((row) => perItemContribution(row, metric));
  const estimates = [];
  let zeroDenominatorReplicateCount = 0;
  for (let replicate = 0; replicate < BOOTSTRAP_REPLICATES; replicate += 1) {
    let numerator = 0;
    let denominator = 0;
    for (let draw = 0; draw < contributions.length; draw += 1) {
      const selected = contributions[bootstrapBoundedIndexV5R11({
        key: observed.activeRunnerRegistrationHash,
        metric,
        replicate,
        draw,
        bound: contributions.length,
      })];
      numerator += selected.numerator;
      denominator += selected.denominator;
    }
    if (denominator === 0) {
      zeroDenominatorReplicateCount += 1;
      estimates.push(direction === "MAXIMUM" ? 1 : 0);
    } else estimates.push(numerator / denominator);
  }
  estimates.sort((left, right) => left - right);
  return Object.freeze({
    p5: percentileType7(estimates, 0.05),
    p95: percentileType7(estimates, 0.95),
    validReplicateCount: estimates.length,
    zeroDenominatorReplicateCount,
  });
}

function surfaceCounts(matrix, metric) {
  if (metric === "SURFACE_SENSITIVITY") return { numerator: matrix.tp,
    denominator: matrix.tp + matrix.fn };
  if (metric === "SPECIFICITY") return { numerator: matrix.tn,
    denominator: matrix.tn + matrix.fp };
  if (metric === "FALSE_POSITIVE_RATE") return { numerator: matrix.fp,
    denominator: matrix.tn + matrix.fp };
  throw new TypeError(`R11 unsupported surface metric ${metric}`);
}

function exactSurfaceWorldBounds(counterfactual, metric) {
  requireCondition(counterfactual.surfaceWorlds.length > 0,
    "R11 surface counterfactual worlds are absent");
  const bounds = counterfactual.surfaceWorlds.map(({ confusionMatrix }) => {
    const { numerator, denominator } = surfaceCounts(confusionMatrix, metric);
    return denominator === 0 ? { lower: 0, upper: 1 }
      : wilsonIntervalV5R11(numerator, denominator, ONE_SIDED_Z95);
  });
  return Object.freeze({ lower: Math.min(...bounds.map(({ lower }) => lower)),
    upper: Math.max(...bounds.map(({ upper }) => upper)) });
}

function metricStatus(metric, denominator, conservativeLower, conservativeUpper,
  observedFalseNegativeCount = null) {
  const rule = METRIC_RULES[metric];
  if (metric === "P0_FALSE_NEGATIVE_COUNT") {
    if (observedFalseNegativeCount > 0) return "NOT_MET";
    return denominator >= rule.minimumN ? "MET" : "UNDERPOWERED";
  }
  if (!rule.decisionEligible) return "UNDERPOWERED";
  if (rule.direction === "MINIMUM") {
    if (conservativeUpper !== null && conservativeUpper < rule.threshold) return "NOT_MET";
    if (denominator < rule.minimumN) return "UNDERPOWERED";
    return conservativeLower !== null && conservativeLower >= rule.threshold
      ? "MET" : "UNDERPOWERED";
  }
  if (conservativeLower !== null && conservativeLower > rule.threshold) return "NOT_MET";
  if (denominator < rule.minimumN) return "UNDERPOWERED";
  return conservativeUpper !== null && conservativeUpper <= rule.threshold
    ? "MET" : "UNDERPOWERED";
}

function proportionMetric(metric, numerator, denominator, clusterCount, observed, counterfactual) {
  const rule = METRIC_RULES[metric];
  const oneSided = wilsonIntervalV5R11(numerator, denominator, ONE_SIDED_Z95);
  const twoSided = wilsonIntervalV5R11(numerator, denominator, TWO_SIDED_Z95);
  const bootstrap = rule.bootstrap ? bootstrapBounds(observed, metric, rule.direction)
    : { p5: null, p95: null, validReplicateCount: 0, zeroDenominatorReplicateCount: 0 };
  const surface = ["SURFACE_SENSITIVITY", "SPECIFICITY", "FALSE_POSITIVE_RATE"].includes(metric);
  const additionField = {
    FAMILY_RECALL: "familyRecall",
    EXACT_CODE_AND_FAMILY_RECALL: "exactCodeAndFamilyRecall",
    P1_RECALL: "p1Recall",
    P2_MISSED_OR_UNRESOLVED_RATE: "p2MissedOrUnresolved",
  }[metric];
  const adverseAdditions = additionField
    ? counterfactual.maximumAdverseFindingOpportunityAdditions[additionField] : 0;
  let worstCaseMissingLower;
  let worstCaseMissingUpper;
  let worstCaseMissingMethod;
  if (counterfactual.integrityLimitExceeded) {
    worstCaseMissingLower = 0;
    worstCaseMissingUpper = 1;
    worstCaseMissingMethod = INTEGRITY_LIMIT_METHOD;
  } else if (surface) {
    const bounds = exactSurfaceWorldBounds(counterfactual, metric);
    worstCaseMissingLower = bounds.lower;
    worstCaseMissingUpper = bounds.upper;
    worstCaseMissingMethod = SURFACE_ENUMERATION_METHOD;
  } else if (counterfactual.findingDecisionBoundUnidentified
    || (["FAMILY_PRECISION", "EXACT_CODE_PRECISION"].includes(metric)
      && counterfactual.machineNonresolvedResolvedReferenceItemCount > 0)) {
    worstCaseMissingLower = 0;
    worstCaseMissingUpper = 1;
    worstCaseMissingMethod = FINDING_UNIDENTIFIED_METHOD;
  } else {
    const adverseDenominator = denominator + adverseAdditions;
    const adverseNumerator = rule.direction === "MAXIMUM" ? numerator + adverseAdditions : numerator;
    const adverse = wilsonIntervalV5R11(adverseNumerator, adverseDenominator, ONE_SIDED_Z95);
    worstCaseMissingLower = adverse.lower;
    worstCaseMissingUpper = adverse.upper;
    worstCaseMissingMethod = FINDING_ADVERSE_METHOD;
  }
  const lowerCandidates = [oneSided.lower, bootstrap.p5, worstCaseMissingLower]
    .filter((value) => value !== null);
  const upperCandidates = [oneSided.upper, bootstrap.p95, worstCaseMissingUpper]
    .filter((value) => value !== null);
  const conservativeLower = lowerCandidates.length > 0 ? Math.min(...lowerCandidates) : null;
  const conservativeUpper = upperCandidates.length > 0 ? Math.max(...upperCandidates) : null;
  const degenerateNoOpportunity = denominator === 0 || clusterCount === 0;
  const decisionLower = degenerateNoOpportunity ? 0 : conservativeLower;
  const decisionUpper = degenerateNoOpportunity ? 1 : conservativeUpper;
  const status = degenerateNoOpportunity ? "UNDERPOWERED" : rule.direction === "DESCRIPTIVE"
    || (!surface && counterfactual.findingDecisionBoundUnidentified)
    ? "UNDERPOWERED" : metricStatus(metric, clusterCount, decisionLower, decisionUpper);
  return Object.freeze({
    metric,
    metricKind: "PROPORTION_DECISION_METRIC",
    numerator,
    denominator,
    independentContributingClusterCount: clusterCount,
    pointEstimate: denominator === 0 ? null : numerator / denominator,
    oneSidedWilsonLcb95: oneSided.lower,
    oneSidedWilsonUcb95: oneSided.upper,
    twoSidedWilsonL95: twoSided.lower,
    twoSidedWilsonU95: twoSided.upper,
    clusterBootstrapP5: bootstrap.p5,
    clusterBootstrapP95: bootstrap.p95,
    bootstrapReplicates: rule.bootstrap ? BOOTSTRAP_REPLICATES : 0,
    bootstrapValidReplicateCount: bootstrap.validReplicateCount,
    bootstrapZeroDenominatorReplicateCount: bootstrap.zeroDenominatorReplicateCount,
    bootstrapZeroDenominatorRule: rule.bootstrap
      ? "ASSIGN_ADVERSE_BOUND_ZERO_FOR_MINIMUM_ONE_FOR_MAXIMUM" : "NOT_APPLICABLE",
    bootstrapSeedDerivation: rule.bootstrap
      ? "SHA256_COUNTER_KEYED_BY_REGISTRATION_HASH_METRIC_REPLICATE_DRAW_WITH_UNBIASED_REJECTION"
      : "NOT_APPLICABLE_ITEM_LEVEL_WILSON",
    bootstrapPercentileConvention: rule.bootstrap ? "TYPE_7" : "NOT_APPLICABLE",
    worstCaseMissingLower,
    worstCaseMissingUpper,
    worstCaseMissingMethod,
    adverseOpportunityAdditions: adverseAdditions,
    conservativeLower: decisionLower,
    conservativeUpper: decisionUpper,
    thresholdDirection: rule.direction,
    threshold: rule.threshold,
    minimumN: rule.minimumN,
    status,
    decisionEligible: rule.decisionEligible,
  });
}

function recomputeMetrics(observed, counterfactual) {
  const counts = observed.findingCounts;
  const confusion = observed.confusionMatrix;
  return Object.freeze([
    proportionMetric("SURFACE_SENSITIVITY", confusion.tp, confusion.tp + confusion.fn,
      confusion.tp + confusion.fn, observed, counterfactual),
    proportionMetric("SPECIFICITY", confusion.tn, confusion.tn + confusion.fp,
      confusion.tn + confusion.fp, observed, counterfactual),
    proportionMetric("FALSE_POSITIVE_RATE", confusion.fp, confusion.tn + confusion.fp,
      confusion.tn + confusion.fp, observed, counterfactual),
    proportionMetric("FAMILY_RECALL", counts.familyMatchedReferenceCount,
      counts.referenceFindingCount, counts.familyOpportunityItemCount, observed, counterfactual),
    proportionMetric("EXACT_CODE_AND_FAMILY_RECALL", counts.exactMatchedReferenceCount,
      counts.referenceFindingCount, counts.familyOpportunityItemCount, observed, counterfactual),
    proportionMetric("FAMILY_PRECISION", counts.familyMatchedMachineCount,
      counts.machineFindingCount, counts.precisionOpportunityItemCount, observed, counterfactual),
    proportionMetric("EXACT_CODE_PRECISION", counts.exactMatchedMachineCount,
      counts.machineFindingCount, counts.precisionOpportunityItemCount, observed, counterfactual),
    Object.freeze({
      metric: "FALSE_FINDINGS_PER_100",
      metricKind: "DESCRIPTIVE_RATE_PER_100",
      unmatchedFindingCount: counts.unmatchedMachineCount,
      registeredItemCount: EXPECTED_ITEM_COUNT,
      ratePer100: counts.unmatchedMachineCount / EXPECTED_ITEM_COUNT * 100,
      status: "UNDERPOWERED",
      decisionEligible: false,
    }),
    Object.freeze({
      metric: "P0_FALSE_NEGATIVE_COUNT",
      metricKind: "OBSERVED_COUNT_GATE",
      observedFalseNegativeCount: counts.p0FalseNegativeItemCount,
      observedOpportunityCount: counts.p0OpportunityItemCount,
      observedMissRate: counts.p0OpportunityItemCount === 0 ? null
        : counts.p0FalseNegativeItemCount / counts.p0OpportunityItemCount,
      oneSidedWilsonMissRateLcb95: wilsonIntervalV5R11(counts.p0FalseNegativeItemCount,
        counts.p0OpportunityItemCount, ONE_SIDED_Z95).lower,
      oneSidedWilsonMissRateUcb95: wilsonIntervalV5R11(counts.p0FalseNegativeItemCount,
        counts.p0OpportunityItemCount, ONE_SIDED_Z95).upper,
      twoSidedWilsonMissRateL95: wilsonIntervalV5R11(counts.p0FalseNegativeItemCount,
        counts.p0OpportunityItemCount, TWO_SIDED_Z95).lower,
      twoSidedWilsonMissRateU95: wilsonIntervalV5R11(counts.p0FalseNegativeItemCount,
        counts.p0OpportunityItemCount, TWO_SIDED_Z95).upper,
      observedFindingFalseNegativeCount: counts.p0FalseNegativeCount,
      observedFindingCount: counts.p0ReferenceCount,
      missingFalseNegativesFabricated: 0,
      minimumN: METRIC_RULES.P0_FALSE_NEGATIVE_COUNT.minimumN,
      status: metricStatus("P0_FALSE_NEGATIVE_COUNT", counts.p0OpportunityItemCount,
        null, null, counts.p0FalseNegativeItemCount),
      decisionEligible: true,
    }),
    proportionMetric("P1_RECALL", counts.p1MatchedCount, counts.p1ReferenceCount,
      counts.p1OpportunityItemCount, observed, counterfactual),
    proportionMetric("P2_MISSED_OR_UNRESOLVED_RATE", counts.p2MissedCount,
      counts.p2ReferenceCount, counts.p2OpportunityItemCount, observed, counterfactual),
  ]);
}

function invalidationCauseCodes(input) {
  const causes = [];
  if (Date.parse(input.thresholdsFrozenAt) >= Date.parse(input.firstReferenceAttemptAt)
    || Date.parse(input.thresholdsFrozenAt) >= Date.parse(input.firstEvaluationAttemptAt)) {
    causes.push("THRESHOLD_FROZEN_AFTER_LABEL_OR_RESULT");
  }
  if (input.materialDeviation === true) causes.push("FRAME_MANIFEST_SCHEMA_MODEL_ENDPOINT_OR_RUNNER_HASH_DRIFT");
  if (input.postResultDesignDrift === true) causes.push("RESULT_DEPENDENT_REPLACEMENT_PROMPT_TUNING_OR_REROLL");
  if (input.labelLeakage === true) causes.push("LABEL_LEAKAGE");
  if (input.unauthorizedProviderCall === true) causes.push("UNAUTHORIZED_PROVIDER_CALL");
  return unique(causes);
}

function deriveDecision(input, integrity, metrics) {
  if (invalidationCauseCodes(input).length > 0) return "INVALID_FOR_GENERALIZATION";
  if (integrity.status !== "INTACT") return "EXECUTION_INTEGRITY_FAILED";
  const p0 = metrics.find(({ metric }) => metric === "P0_FALSE_NEGATIVE_COUNT");
  if (p0.observedFalseNegativeCount > 0) return "POLICY_REVISION_REQUIRED_MACHINE_REFERENCE";
  if (metrics.some((metric) => metric.metricKind === "PROPORTION_DECISION_METRIC"
    && metric.decisionEligible && metric.status === "NOT_MET")) {
    return "POLICY_REVISION_REQUIRED_MACHINE_REFERENCE";
  }
  return "INCONCLUSIVE_MACHINE_REFERENCE";
}

function validateInputChronology(input) {
  requireCondition([input.thresholdsFrozenAt, input.firstReferenceAttemptAt,
    input.firstEvaluationAttemptAt, input.scoredAt].every(iso),
  "R11 statistical chronology requires explicit timestamps");
  for (const field of ["receiptChainValid", "providerTupleValid", "capsValid",
    "terminalProviderFailure", "materialDeviation", "postResultDesignDrift",
    "labelLeakage", "unauthorizedProviderCall"]) {
    requireCondition(typeof input[field] === "boolean", `R11 ${field} must be Boolean evidence`);
  }
}

export function buildFrozenStatisticalBundleV5R11(input) {
  assertGoldenVectors();
  validateInputChronology(input);
  const observedLedger = buildObservedLedger(input);
  const counterfactualLedger = buildCounterfactualLedger(observedLedger);
  const executionIntegrity = deriveExecutionIntegrity(input, observedLedger);
  const invalid = invalidationCauseCodes(input).length > 0;
  const metricResults = executionIntegrity.status === "INTACT" && !invalid
    ? recomputeMetrics(observedLedger, counterfactualLedger) : null;
  const overallDecision = deriveDecision(input, executionIntegrity, metricResults ?? []);
  const completedItemMarkers = input.itemResults.filter(({ executionDisposition }) =>
    executionDisposition === "COMPLETE").map(({ manifestOrdinal, itemHash, completedItemMarkerHash }) =>
    Object.freeze({ manifestOrdinal, itemHash, selfHash: completedItemMarkerHash }));
  const metricInputLedger = assertClosedSelfHashedArtifactV5R11(sealV5R3Artifact({
    schemaVersion: "MetricInputLedgerV2",
    designId: DESIGN_ID,
    activeRunnerRegistrationHash: input.activeRunnerRegistrationHash,
    itemResultSetHash: observedLedger.itemResultSetHash,
    contributions: observedLedger.contributions,
  }), "MetricInputLedgerV2");
  const finalReceipt = assertClosedSelfHashedArtifactV5R11(sealV5R3Artifact({
    schemaVersion: "FinalEvaluationReceiptV2",
    designId: DESIGN_ID,
    activeRunnerRegistrationHash: input.activeRunnerRegistrationHash,
    sampleExecutionInventoryHash: input.sampleExecutionInventoryHash,
    referenceSealHash: input.referenceSealHash,
    executionRegistrationHash: input.executionRegistrationHash,
    deepSeekAuthorizationHash: input.deepSeekAuthorizationHash,
    c0ExecutionSetHash: input.c0ExecutionSetHash,
    itemResultSetHash: observedLedger.itemResultSetHash,
    completedItemMarkerRootHash: root(completedItemMarkers.map(({ manifestOrdinal, itemHash, selfHash }) =>
      [manifestOrdinal, itemHash, selfHash])),
    observedLedgerHash: observedLedger.selfHash,
    counterfactualLedgerHash: counterfactualLedger.selfHash,
    metricInputLedgerHash: metricInputLedger.selfHash,
    itemResultCount: EXPECTED_ITEM_COUNT,
    completedItemMarkerCount: completedItemMarkers.length,
    accounting: observedLedger.accounting,
    confusionMatrix: observedLedger.confusionMatrix,
    metricResults,
    metricOutputCount: metricResults?.length ?? 0,
    statisticalKernel: {
      methodVersion: "MAIS-NATURAL-CA60-V5-R11_NATIVE_FROZEN_STATISTICAL_KERNEL",
      metricDecisionMethodHash: DESIGN.analysis.frozenMethodComponentRoots.metricDecisionMethodHash,
      bootstrapReplicates: BOOTSTRAP_REPLICATES,
      bootstrapPrng: DESIGN.analysis.confidenceIntervals.bootstrapPrng,
      bootstrapGoldenVectors: BOOTSTRAP_GOLDEN_VECTORS_V5_R11,
      bootstrapGoldenVectorsVerified: true,
      matchingOrder: DESIGN.analysis.matching.order,
      matchingTieBreak: DESIGN.analysis.matching.tieBreak,
      unifiedNonresolvedFormula: DESIGN.analysis.missingData.unifiedNonresolvedUniverseFormula,
    },
    executionIntegrity,
    invalidationCauseCodes: invalidationCauseCodes(input),
    analysisStatus: metricResults
      ? "COMPLETE_FROZEN_METRIC_ANALYSIS"
      : overallDecision === "INVALID_FOR_GENERALIZATION"
        ? "INVALID_NO_METRIC_INFERENCE"
        : "TERMINAL_INTEGRITY_DECISION_NO_METRIC_INFERENCE",
    overallDecision,
    decisionCeiling: "INCONCLUSIVE_MACHINE_REFERENCE",
    claimCeiling: "CALIFORNIA_RUNTIME_EGRESS_ELIGIBLE_MACHINE_REFERENCE_PILOT_ONLY",
    passClaimAllowed: false,
    limitedGeneralizationEvidenceAllowed: false,
    missingDataImputedAsNegative: false,
    scoredAt: input.scoredAt,
  }), "FinalEvaluationReceiptV2");
  return Object.freeze({
    itemResults: Object.freeze([...input.itemResults]),
    completedItemMarkers: Object.freeze(completedItemMarkers),
    observedLedger,
    counterfactualLedger,
    metricInputLedger,
    metricResults,
    executionIntegrity,
    finalReceipt,
  });
}

export function verifyFrozenStatisticalBundleV5R11(input, bundle) {
  const errors = [];
  try {
    const rebuilt = buildFrozenStatisticalBundleV5R11(input);
    for (const field of ["itemResults", "completedItemMarkers", "observedLedger",
      "counterfactualLedger", "metricInputLedger", "metricResults", "executionIntegrity",
      "finalReceipt"]) {
      if (canonicalJsonV5R3(rebuilt[field]) !== canonicalJsonV5R3(bundle?.[field])) {
        errors.push(`R11 ${field} differs from independent frozen-method reconstruction`);
      }
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return Object.freeze(unique(errors));
}

function terminalReceiptBody(input) {
  validateInputChronology(input);
  requireCondition(Array.isArray(input.terminalCauseCodes) && input.terminalCauseCodes.length > 0
    && input.terminalCauseCodes.every((value) => typeof value === "string" && value.length > 0),
  "R11 terminal cause codes are required");
  const observed = buildObservedLedger(input);
  const integrity = deriveExecutionIntegrity(input, observed);
  requireCondition(integrity.status === "FAILED",
    "R11 terminal integrity receipt requires independently failed execution integrity");
  const causes = unique([...input.terminalCauseCodes, ...integrity.causeCodes]).sort(codePointCompare);
  for (const field of ["attemptGraphReceiptHash", "ledgerEntryRootHash",
    "resolvedAttemptReceiptRootHash", "commandJournalRootHash", "decisionEvidenceReceiptHash",
    "terminalCauseEvidenceRootHash"]) {
    requireCondition(HASH.test(input[field] ?? ""), `R11 terminal receipt ${field} is absent`);
  }
  const completedItemMarkers = input.itemResults.filter(({ executionDisposition }) =>
    executionDisposition === "COMPLETE").map(({ manifestOrdinal, itemHash, completedItemMarkerHash }) => ({
      manifestOrdinal, itemHash, selfHash: completedItemMarkerHash,
    }));
  return {
    schemaVersion: "TerminalExecutionDecisionReceiptV2",
    designId: DESIGN_ID,
    activeRunnerRegistrationHash: input.activeRunnerRegistrationHash,
    sampleExecutionInventoryHash: input.sampleExecutionInventoryHash,
    referenceSealHash: input.referenceSealHash,
    executionRegistrationHash: input.executionRegistrationHash,
    deepSeekAuthorizationHash: input.deepSeekAuthorizationHash,
    c0ExecutionSetHash: input.c0ExecutionSetHash,
    attemptGraphReceiptHash: input.attemptGraphReceiptHash,
    ledgerEntryRootHash: input.ledgerEntryRootHash,
    resolvedAttemptReceiptRootHash: input.resolvedAttemptReceiptRootHash,
    commandJournalRootHash: input.commandJournalRootHash,
    decisionEvidenceReceiptHash: input.decisionEvidenceReceiptHash,
    terminalCauseEvidenceRootHash: input.terminalCauseEvidenceRootHash,
    itemResultSetHash: observed.itemResultSetHash,
    completedItemMarkerRootHash: root(completedItemMarkers.map(({ manifestOrdinal, itemHash, selfHash }) =>
      [manifestOrdinal, itemHash, selfHash])),
    observedItemResultCount: observed.accounting.completeReceiptItemCount,
    missingItemCount: observed.accounting.missingReceiptItemCount,
    unifiedNonresolvedItemCount: observed.accounting.unifiedNonresolvedItemCount,
    terminalCauseCodes: causes,
    metricResults: null,
    metricOutputCount: 0,
    analysisStatus: "TERMINAL_INTEGRITY_DECISION_NO_METRIC_INFERENCE",
    overallDecision: invalidationCauseCodes(input).length > 0
      ? "INVALID_FOR_GENERALIZATION" : "EXECUTION_INTEGRITY_FAILED",
    decisionCeiling: "INCONCLUSIVE_MACHINE_REFERENCE",
    passClaimAllowed: false,
    limitedGeneralizationEvidenceAllowed: false,
    missingDataImputedAsNegative: false,
    derivedAt: input.scoredAt,
  };
}

export function buildTerminalExecutionDecisionReceiptV5R11(input) {
  return assertClosedSelfHashedArtifactV5R11(sealV5R3Artifact(terminalReceiptBody(input)),
    "TerminalExecutionDecisionReceiptV2");
}

export function verifyTerminalExecutionDecisionReceiptV5R11({ receipt, ...input }) {
  const errors = [];
  try {
    requireCondition(validateSelfHashV5R3(receipt), "R11 terminal receipt self-hash is invalid");
    const rebuilt = buildTerminalExecutionDecisionReceiptV5R11(input);
    if (canonicalJsonV5R3(rebuilt) !== canonicalJsonV5R3(receipt)) {
      errors.push("R11 terminal decision receipt differs from immutable item and integrity evidence reconstruction");
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return Object.freeze(unique(errors));
}

export const STATISTICAL_KERNEL_V5_R11_CONSTANTS = Object.freeze({
  expectedItemCount: EXPECTED_ITEM_COUNT,
  bootstrapReplicates: BOOTSTRAP_REPLICATES,
  oneSidedZ95: ONE_SIDED_Z95,
  twoSidedZ95: TWO_SIDED_Z95,
  metricOutputCount: 11,
  maximumUnifiedNonresolvedItems: 3,
  maximumSurfaceWorlds: 64,
  decisionCeiling: "INCONCLUSIVE_MACHINE_REFERENCE",
  missingDataImputedAsNegative: false,
  legacyScorerV5R3Imported: false,
});
