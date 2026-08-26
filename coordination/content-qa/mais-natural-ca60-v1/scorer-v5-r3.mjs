import { sealV5R3Artifact, validateSelfHashV5R3 } from "./execution-integrity-v5-r3.mjs";

const ONE_SIDED_Z95 = 1.6448536269514722;
const TWO_SIDED_Z95 = 1.959963984540054;
const BOOTSTRAP_REPLICATES = 10_000;

function wilson(successes, denominator, z) {
  if (denominator === 0) return { lower: null, upper: null };
  const p = successes / denominator;
  const z2 = z * z;
  const scale = 1 + z2 / denominator;
  const center = (p + z2 / (2 * denominator)) / scale;
  const radius = (z * Math.sqrt((p * (1 - p) / denominator) + (z2 / (4 * denominator * denominator)))) / scale;
  return { lower: Math.max(0, center - radius), upper: Math.min(1, center + radius) };
}

export function wilsonIntervalV5R3(successes, denominator) {
  if (![successes, denominator].every(Number.isSafeInteger) || successes < 0 || denominator < 0 || successes > denominator) throw new TypeError("Wilson counts are invalid");
  if (denominator === 0) return Object.freeze({ status: "NO_DENOMINATOR", successes, denominator, pointEstimate: null, oneSidedLower95: null, oneSidedUpper95: null, twoSidedLower95: null, twoSidedUpper95: null });
  const one = wilson(successes, denominator, ONE_SIDED_Z95);
  const two = wilson(successes, denominator, TWO_SIDED_Z95);
  return Object.freeze({
    status: "ESTIMATED",
    successes,
    denominator,
    pointEstimate: successes / denominator,
    oneSidedLower95: one.lower,
    oneSidedUpper95: one.upper,
    twoSidedLower95: two.lower,
    twoSidedUpper95: two.upper,
  });
}

function sortedFindings(findings) {
  if (!Array.isArray(findings)) throw new TypeError("findings must be arrays");
  return [...findings].sort((a, b) => `${a.code}\u0000${a.family}\u0000${a.findingId}`.localeCompare(`${b.code}\u0000${b.family}\u0000${b.findingId}`));
}

export function matchFindingsV5R3(referenceFindings, machineFindings) {
  const references = sortedFindings(referenceFindings);
  const machines = sortedFindings(machineFindings);
  const unmatchedReferences = new Set(references.map((finding) => finding.findingId));
  const unmatchedMachines = new Set(machines.map((finding) => finding.findingId));
  const matches = [];
  for (const matchLevel of ["EXACT_CODE_AND_FAMILY", "FAMILY_ONLY"]) {
    for (const reference of references) {
      if (!unmatchedReferences.has(reference.findingId)) continue;
      const machine = machines.find((candidate) => unmatchedMachines.has(candidate.findingId)
        && candidate.family === reference.family
        && (matchLevel === "FAMILY_ONLY" || candidate.code === reference.code));
      if (!machine) continue;
      unmatchedReferences.delete(reference.findingId);
      unmatchedMachines.delete(machine.findingId);
      matches.push(Object.freeze({ referenceFindingId: reference.findingId, machineFindingId: machine.findingId, matchLevel, code: reference.code, family: reference.family, severity: reference.severity }));
    }
  }
  return Object.freeze({
    matches: Object.freeze(matches),
    unmatchedReferenceFindingIds: Object.freeze(references.filter((finding) => unmatchedReferences.has(finding.findingId)).map((finding) => finding.findingId)),
    unmatchedMachineFindingIds: Object.freeze(machines.filter((finding) => unmatchedMachines.has(finding.findingId)).map((finding) => finding.findingId)),
  });
}

function quantile(sorted, probability) {
  if (sorted.length === 0) return null;
  const index = (sorted.length - 1) * probability;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + ((sorted[upper] - sorted[lower]) * (index - lower));
}

function seededRandom(hash) {
  let state = Number.parseInt(hash.slice(0, 8), 16) >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function clusterBootstrap(itemCounts, registrationHash) {
  if (itemCounts.length === 0) return { familyLower95: null, familyUpper95: null, exactLower95: null, exactUpper95: null, precisionLower95: null, precisionUpper95: null };
  const random = seededRandom(registrationHash);
  const family = [];
  const exact = [];
  const precision = [];
  for (let replicate = 0; replicate < BOOTSTRAP_REPLICATES; replicate += 1) {
    let reference = 0;
    let familyMatched = 0;
    let exactMatched = 0;
    let machine = 0;
    for (let draw = 0; draw < itemCounts.length; draw += 1) {
      const item = itemCounts[Math.floor(random() * itemCounts.length)];
      reference += item.reference;
      familyMatched += item.familyMatched;
      exactMatched += item.exactMatched;
      machine += item.machine;
    }
    if (reference > 0) {
      family.push(familyMatched / reference);
      exact.push(exactMatched / reference);
    }
    if (machine > 0) precision.push(familyMatched / machine);
  }
  family.sort((a, b) => a - b);
  exact.sort((a, b) => a - b);
  precision.sort((a, b) => a - b);
  return {
    familyLower95: quantile(family, 0.05), familyUpper95: quantile(family, 0.95),
    exactLower95: quantile(exact, 0.05), exactUpper95: quantile(exact, 0.95),
    precisionLower95: quantile(precision, 0.025), precisionUpper95: quantile(precision, 0.975),
  };
}

function minimumMetric({ successes, denominator, threshold, minimumDenominator, bootstrapLower = null, missing = 0 }) {
  const interval = wilsonIntervalV5R3(successes, denominator);
  const worstCaseLower = denominator + missing > 0 ? successes / (denominator + missing) : null;
  const candidates = [interval.oneSidedLower95, bootstrapLower, worstCaseLower].filter((value) => value !== null);
  const decisionLower95 = candidates.length > 0 ? Math.min(...candidates) : null;
  const status = denominator < minimumDenominator || decisionLower95 === null
    ? "UNDERPOWERED"
    : decisionLower95 >= threshold ? "MET" : "NOT_MET";
  return Object.freeze({ ...interval, threshold, minimumDenominator, status, decisionLower95, worstCaseLower });
}

function maximumMetric({ errors, denominator, threshold, minimumDenominator, missing = 0 }) {
  const interval = wilsonIntervalV5R3(errors, denominator);
  const worstCaseUpper = denominator + missing > 0 ? (errors + missing) / (denominator + missing) : null;
  const candidates = [interval.oneSidedUpper95, worstCaseUpper].filter((value) => value !== null);
  const decisionUpper95 = candidates.length > 0 ? Math.max(...candidates) : null;
  const status = denominator < minimumDenominator || decisionUpper95 === null
    ? "UNDERPOWERED"
    : decisionUpper95 <= threshold ? "MET" : "NOT_MET";
  return Object.freeze({ ...interval, threshold, minimumDenominator, status, decisionUpper95, worstCaseUpper, errors });
}

function validateScoringInput(input) {
  if (!validateSelfHashV5R3(input) || input.schemaVersion !== "NaturalCaScoringInputV1") throw new TypeError("sealed NaturalCaScoringInputV1 is required");
  if (!Array.isArray(input.items)) throw new TypeError("scoring items are missing");
  const itemHashes = new Set();
  const clusters = new Set();
  for (const [index, item] of input.items.entries()) {
    if (!/^[0-9a-f]{64}$/u.test(item.itemHash ?? "") || itemHashes.has(item.itemHash)) throw new TypeError(`item ${index + 1} hash is invalid or duplicated`);
    if (typeof item.clusterId !== "string" || item.clusterId.length === 0 || clusters.has(item.clusterId)) throw new TypeError(`item ${index + 1} cluster is invalid or duplicated`);
    itemHashes.add(item.itemHash);
    clusters.add(item.clusterId);
    sortedFindings(item.referenceFindings);
    sortedFindings(item.machineFindings);
  }
}

export function scoreNaturalCaV5R3(input) {
  validateScoringInput(input);
  const itemRows = [];
  let tp = 0; let fp = 0; let fn = 0; let tn = 0;
  let totalReference = 0; let totalMachine = 0; let familyMatched = 0; let exactMatched = 0;
  let p0FalseNegatives = 0; let p0Opportunities = 0; let p1Matched = 0; let p1Total = 0; let p2Missed = 0; let p2Total = 0;
  for (const item of input.items) {
    const matched = matchFindingsV5R3(item.referenceFindings, item.machineFindings);
    const referenceById = new Map(item.referenceFindings.map((finding) => [finding.findingId, finding]));
    const matchedReferenceIds = new Set(matched.matches.map((entry) => entry.referenceFindingId));
    const referencePositive = item.referenceFindings.length > 0;
    const machinePositive = item.machineFindings.length > 0;
    if (referencePositive && machinePositive) tp += 1;
    else if (referencePositive) fn += 1;
    else if (machinePositive) fp += 1;
    else tn += 1;
    totalReference += item.referenceFindings.length;
    totalMachine += item.machineFindings.length;
    familyMatched += matched.matches.length;
    exactMatched += matched.matches.filter((entry) => entry.matchLevel === "EXACT_CODE_AND_FAMILY").length;
    for (const finding of item.referenceFindings) {
      const hit = matchedReferenceIds.has(finding.findingId);
      if (finding.severity === "P0") { p0Opportunities += 1; if (!hit) p0FalseNegatives += 1; }
      if (finding.severity === "P1") { p1Total += 1; if (hit) p1Matched += 1; }
      if (finding.severity === "P2") { p2Total += 1; if (!hit) p2Missed += 1; }
    }
    itemRows.push({
      itemHash: item.itemHash,
      clusterId: item.clusterId,
      reference: item.referenceFindings.length,
      machine: item.machineFindings.length,
      familyMatched: matched.matches.length,
      exactMatched: matched.matches.filter((entry) => entry.matchLevel === "EXACT_CODE_AND_FAMILY").length,
      falseFindingCount: matched.unmatchedMachineFindingIds.length,
      unmatchedReferenceSeverities: matched.unmatchedReferenceFindingIds.map((id) => referenceById.get(id)?.severity ?? null),
      matching: matched,
    });
  }
  const missing = Math.max(0, input.expectedItemCount - input.items.length);
  const bootstrap = clusterBootstrap(itemRows, input.registrationHash);
  const sensitivity = minimumMetric({ successes: tp, denominator: tp + fn, threshold: 0.9, minimumDenominator: 25, missing });
  const specificity = minimumMetric({ successes: tn, denominator: tn + fp, threshold: 0.95, minimumDenominator: 52, missing });
  const fprInterval = wilsonIntervalV5R3(fp, fp + tn);
  const familyRecall = minimumMetric({ successes: familyMatched, denominator: totalReference, threshold: 0.85, minimumDenominator: 18, bootstrapLower: bootstrap.familyLower95, missing });
  const exactRecall = minimumMetric({ successes: exactMatched, denominator: totalReference, threshold: 0.85, minimumDenominator: 18, bootstrapLower: bootstrap.exactLower95, missing });
  const p1Recall = minimumMetric({ successes: p1Matched, denominator: p1Total, threshold: 0.9, minimumDenominator: 25, missing });
  const p2Rate = maximumMetric({ errors: p2Missed + input.unresolvedOrInvalidCount, denominator: p2Total + input.unresolvedOrInvalidCount, threshold: 0.1, minimumDenominator: 25, missing });
  const thresholdLate = Date.parse(input.thresholdsFrozenAt) >= Date.parse(input.firstReferenceAttemptAt)
    || Date.parse(input.thresholdsFrozenAt) >= Date.parse(input.firstEvaluationAttemptAt);
  let overallDecision;
  if (thresholdLate || input.labelLeakageDetected === true) overallDecision = "INVALID_FOR_GENERALIZATION";
  else if (input.executionIntegrityValid !== true || input.items.length < 57 || input.unresolvedOrInvalidCount > 3) overallDecision = "EXECUTION_INTEGRITY_FAILED";
  else if (p0FalseNegatives > 0
    || [sensitivity, specificity, familyRecall, exactRecall, p1Recall].some((metric) => metric.oneSidedUpper95 !== null && metric.oneSidedUpper95 < metric.threshold)
    || (p2Rate.oneSidedLower95 !== null && p2Rate.oneSidedLower95 > p2Rate.threshold)) {
    overallDecision = "POLICY_REVISION_REQUIRED_MACHINE_REFERENCE";
  } else overallDecision = "INCONCLUSIVE_MACHINE_REFERENCE";
  const falseFindings = itemRows.reduce((total, item) => total + item.falseFindingCount, 0);
  return sealV5R3Artifact({
    schemaVersion: "NaturalCaAggregateScoreReceiptV1",
    registrationHash: input.registrationHash,
    referenceSealHash: input.referenceSealHash,
    executionRegistrationHash: input.executionRegistrationHash,
    completeItemCount: input.items.length,
    expectedItemCount: input.expectedItemCount,
    missingItemCount: missing,
    counts: { tp, fp, fn, tn, totalReferenceFindings: totalReference, totalMachineFindings: totalMachine, familyMatched, exactMatched, falseFindings },
    metrics: {
      surfaceSensitivity: sensitivity,
      surfaceSpecificity: specificity,
      falsePositiveRate: { ...fprInterval, threshold: 0.05 },
      familyRecall,
      exactCodeAndFamilyRecall: exactRecall,
      familyPrecision: totalMachine === 0 ? null : familyMatched / totalMachine,
      exactPrecision: totalMachine === 0 ? null : exactMatched / totalMachine,
      falseFindingsPer100Items: input.items.length === 0 ? null : (falseFindings * 100) / input.items.length,
      p0FalseNegatives: { count: p0FalseNegatives, opportunities: p0Opportunities, observedRule: "ZERO_ALLOWED" },
      p1Recall,
      p2MissedOrUnresolvedRate: p2Rate,
    },
    bootstrap: { seedSource: input.registrationHash, replicates: BOOTSTRAP_REPLICATES, ...bootstrap },
    matchingMatrix: itemRows.map((item) => ({ itemHash: item.itemHash, clusterId: item.clusterId, ...item.matching })),
    overallDecision,
    decisionCeiling: "INCONCLUSIVE_MACHINE_REFERENCE",
    claimCeiling: "CALIFORNIA_MACHINE_REFERENCE_PILOT_ONLY",
    passClaimAllowed: false,
  });
}

export const SCORER_V5_R3_CONSTANTS = Object.freeze({ bootstrapReplicates: BOOTSTRAP_REPLICATES, oneSidedZ95: ONE_SIDED_Z95, twoSidedZ95: TWO_SIDED_Z95 });
