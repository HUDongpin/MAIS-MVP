import { createHash } from "node:crypto";

export const SCHEMA_VERSION = "NaturalCaPilotDesignRegistrationV2";
export const DESIGN_ID = "MAIS-NATURAL-CA60-V2";
export const DESIGN_VERSION = 2;
export const FREEZE_TIMESTAMP = "2026-08-24T16:31:02.000Z";
export const BASELINE_SHA = "b6c7c347a49a813e454e707dd3c16399dcf29909";
export const PRIOR_NATURAL_DESIGN_SHA256 = "85bc51cec9e160c1a23e94e671c85d2de4b52e8b2b8e9afcbcf04b7b19528867";
export const PRESERVATION_ARCHIVE_SHA256 = "2656f336387ed85c495a6b08b96fdf1e34f1942f0e1b3f83421fdab7f7dd0c71";

export const PREDECESSOR_REGISTRATION_HASH = "663303a7331f5c230f3e3238f0253edea81e37dbd9674ab84db28c02d64c6ce7";
export const RESPONSE_FORMS = Object.freeze(["multiple-choice", "fill-in", "short-answer"]);
export const DIFFICULTIES = Object.freeze(["Low", "Medium", "High"]);
export const BINARY_LABELS = Object.freeze(["DEFECT", "NO_FINDING", "UNRESOLVED_REFERENCE"]);
export const SEVERITIES = Object.freeze(["NONE", "P2", "P1", "P0", "UNRESOLVED"]);
export const TAXONOMY = Object.freeze({
  WRONG_CANONICAL_ANSWER: "P0",
  UNSOLVABLE_OR_INTERNALLY_INCONSISTENT: "P0",
  FALSE_ACCEPT_CORRECT_RESPONSE: "P0",
  FALSE_ACCEPT_NEAR_MISS: "P0",
  FALSE_REJECT_CORRECT_RESPONSE: "P0",
  ORACLE_OR_PROMPT_LEAKAGE: "P0",
  EQUIVALENT_ANSWER_NOT_ACCEPTED: "P1",
  MULTIPLE_CORRECT_OPTIONS: "P1",
  MISSING_OR_MISMATCHED_OPTIONS: "P1",
  EXPLANATION_ANSWER_MISMATCH: "P1",
  EVIDENCE_MISMATCH: "P1",
  LANGUAGE_SEMANTIC_MISMATCH: "P1",
  CURRICULUM_OR_METADATA_MISMATCH: "P1",
  MINOR_WORDING_OR_FORMAT: "P2",
  MINOR_EXPLANATION_WEAKNESS: "P2",
  REDUNDANT_OR_NEAR_DUPLICATE: "P2",
  MINOR_METADATA_MISMATCH: "P2",
  NO_FINDING: "NONE",
  UNASSESSABLE: "UNRESOLVED",
  SCHEMA_GAP: "UNRESOLVED",
});
export const TAXONOMY_FAMILY = Object.freeze({
  WRONG_CANONICAL_ANSWER: "CANONICAL_ANSWER_SOLVABILITY",
  UNSOLVABLE_OR_INTERNALLY_INCONSISTENT: "CANONICAL_ANSWER_SOLVABILITY",
  FALSE_ACCEPT_CORRECT_RESPONSE: "RESPONSE_ACCEPTANCE",
  FALSE_ACCEPT_NEAR_MISS: "RESPONSE_ACCEPTANCE",
  FALSE_REJECT_CORRECT_RESPONSE: "RESPONSE_ACCEPTANCE",
  ORACLE_OR_PROMPT_LEAKAGE: "ORACLE_PROMPT_INTEGRITY",
  EQUIVALENT_ANSWER_NOT_ACCEPTED: "RESPONSE_ACCEPTANCE",
  MULTIPLE_CORRECT_OPTIONS: "OPTION_SET_INTEGRITY",
  MISSING_OR_MISMATCHED_OPTIONS: "OPTION_SET_INTEGRITY",
  EXPLANATION_ANSWER_MISMATCH: "EXPLANATION_INTEGRITY",
  EVIDENCE_MISMATCH: "EVIDENCE_INTEGRITY",
  LANGUAGE_SEMANTIC_MISMATCH: "LANGUAGE_SEMANTICS",
  CURRICULUM_OR_METADATA_MISMATCH: "CURRICULUM_METADATA",
  MINOR_WORDING_OR_FORMAT: "WORDING_FORMAT",
  MINOR_EXPLANATION_WEAKNESS: "EXPLANATION_INTEGRITY",
  REDUNDANT_OR_NEAR_DUPLICATE: "DUPLICATION_HOMOLOGY",
  MINOR_METADATA_MISMATCH: "CURRICULUM_METADATA",
  NO_FINDING: null,
  UNASSESSABLE: null,
  SCHEMA_GAP: null,
});
export const TAXONOMY_FAMILIES = Object.freeze([
  "CANONICAL_ANSWER_SOLVABILITY",
  "RESPONSE_ACCEPTANCE",
  "ORACLE_PROMPT_INTEGRITY",
  "OPTION_SET_INTEGRITY",
  "EXPLANATION_INTEGRITY",
  "EVIDENCE_INTEGRITY",
  "LANGUAGE_SEMANTICS",
  "CURRICULUM_METADATA",
  "WORDING_FORMAT",
  "DUPLICATION_HOMOLOGY",
]);
export const DECISION_STATUSES = Object.freeze([
  "NOT_STARTED",
  "BLOCKED_AUTHORIZATION",
  "INVALID_FOR_GENERALIZATION",
  "EXECUTION_INTEGRITY_FAILED",
  "POLICY_REVISION_REQUIRED_MACHINE_REFERENCE",
  "LIMITED_GENERALIZATION_EVIDENCE",
  "INCONCLUSIVE_MACHINE_REFERENCE",
]);
export const REVIEW_STATUSES = Object.freeze(["CONCURRED", "DISCREPANCY", "UNREVIEWABLE"]);
export const FORBIDDEN_OVERALL_DECISION_WORDS = Object.freeze(["PASS", "APPROVED", "PRODUCTION", "PROMOTION"]);
export const SAMPLE_ALGORITHM_VERSION = "natural-ca60-hamilton-v2";
export const SAMPLE_SELECTION_FORMULA = "SHA256(designHash|frameHash|algorithmVersion|stratum|clusterId|itemHash)";
export const STRATA = Object.freeze(RESPONSE_FORMS.flatMap((responseForm) => DIFFICULTIES.map((difficulty) => `${responseForm}::${difficulty}`)));
export const AMBIGUOUS_LITERAL_CODE = "FALSE_ACCEPT_CORRECT_RESPONSE";
export const STATUS_CODES = Object.freeze(["NO_FINDING", "UNASSESSABLE", "SCHEMA_GAP"]);
export const C0_MANDATORY_PREDICATES = Object.freeze([
  ["possibleP0OrP1MathOrAnswerKey", "POSSIBLE_P0_OR_P1_MATH_OR_ANSWER_KEY"],
  ["sourceRightsOrReconstructionRisk", "SOURCE_RIGHTS_OR_RECONSTRUCTION_RISK"],
  ["ageGradeCurriculumLanguageOrRegionRisk", "AGE_GRADE_CURRICULUM_LANGUAGE_OR_REGION_RISK"],
  ["answerCriticalVisualOrEvidence", "ANSWER_CRITICAL_VISUAL_OR_EVIDENCE"],
  ["deterministicVsBPrimeConflict", "DETERMINISTIC_VS_B_PRIME_CONFLICT"],
  ["critiqueVsRevisionConflict", "CRITIQUE_VS_REVISION_CONFLICT"],
  ["invalidTaxonomySchemaOrRole", "INVALID_TAXONOMY_SCHEMA_OR_ROLE"],
  ["outOfScopeMetadataOrEvidence", "OUT_OF_SCOPE_METADATA_OR_EVIDENCE"],
  ["declaredOutOfDistribution", "DECLARED_OUT_OF_DISTRIBUTION"],
]);

function assertWellFormedUtf16(value, path) {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) throw new TypeError(`${path} contains a lone UTF-16 surrogate`);
      index += 1;
    } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      throw new TypeError(`${path} contains a lone UTF-16 surrogate`);
    }
  }
}

function assertJsonValue(value, path, stack) {
  if (value === null || typeof value === "boolean") return;
  if (typeof value === "string") {
    assertWellFormedUtf16(value, path);
    return;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError(`${path} contains a non-finite number`);
    return;
  }
  if (typeof value !== "object") throw new TypeError(`${path} contains unsupported ${typeof value}`);
  if (stack.has(value)) throw new TypeError(`${path} contains a cycle`);
  stack.add(value);
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      if (!Object.hasOwn(value, index)) throw new TypeError(`${path} is sparse at index ${index}`);
      assertJsonValue(value[index], `${path}[${index}]`, stack);
    }
  } else {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) throw new TypeError(`${path} is not a plain object`);
    if (Object.getOwnPropertySymbols(value).length > 0) throw new TypeError(`${path} contains symbol keys`);
    for (const key of Object.keys(value)) {
      assertWellFormedUtf16(key, `${path} property name`);
      assertJsonValue(value[key], `${path}.${key}`, stack);
    }
  }
  stack.delete(value);
}

function canonicalize(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(",")}}`;
}

/** RFC 8785-compatible canonical JSON for the supported JSON value domain. */
export function canonicalJson(value) {
  assertJsonValue(value, "$", new Set());
  return canonicalize(value);
}

export function sha256Hex(value) {
  if (typeof value !== "string" && !Buffer.isBuffer(value)) throw new TypeError("sha256Hex accepts a string or Buffer");
  return createHash("sha256").update(value).digest("hex");
}

export function calculateRegistrationHash(registration) {
  assertJsonValue(registration, "$registration", new Set());
  const { registrationHash: _omitted, ...hashable } = registration;
  return sha256Hex(canonicalJson(hashable));
}

export function calculateArtifactHash(artifact, selfHashField) {
  assertJsonValue(artifact, "$artifact", new Set());
  const hashable = { ...artifact };
  delete hashable[selfHashField];
  return sha256Hex(canonicalJson(hashable));
}

function cellKey(responseForm, difficulty) {
  return `${responseForm}::${difficulty}`;
}

function codePointCompare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function assertPipeSafeField(value, field) {
  if (typeof value !== "string" || value.length === 0 || value.includes("|")) throw new TypeError(`${field} must be a non-empty pipe-free string`);
}

export function selectionDigestV2({ designHash, frameHash, algorithmVersion, stratum, clusterId, itemHash }) {
  for (const [field, value] of Object.entries({ designHash, frameHash, algorithmVersion, stratum, clusterId, itemHash })) assertPipeSafeField(value, field);
  return sha256Hex(`${designHash}|${frameHash}|${algorithmVersion}|${stratum}|${clusterId}|${itemHash}`);
}

export function assignClusterToStratumV2({ designHash, frameHash, algorithmVersion, clusterId, members }) {
  if (!Array.isArray(members) || members.length === 0) throw new TypeError("cluster members are required");
  assertPipeSafeField(clusterId, "clusterId");
  const ranked = members.map((member) => {
    assertPipeSafeField(member.itemId, "itemId");
    if (!RESPONSE_FORMS.includes(member.responseForm) || !DIFFICULTIES.includes(member.difficulty)) throw new TypeError("member has an unfrozen stratum value");
    const assignedStratum = cellKey(member.responseForm, member.difficulty);
    return {
      ...member,
      assignedStratum,
      selectionDigest: selectionDigestV2({ designHash, frameHash, algorithmVersion, stratum: assignedStratum, clusterId, itemHash: member.itemHash }),
    };
  }).sort((left, right) => codePointCompare(left.selectionDigest, right.selectionDigest) || codePointCompare(left.itemId, right.itemId));
  return ranked[0];
}

/**
 * Capacity-constrained Hamilton allocation using exact integer remainder
 * comparisons. Weights always remain the original eligible counts. When a
 * cell saturates, overflow is redistributed in a new deterministic round.
 */
export function computeCapacityConstrainedHamilton(capacities, target = 60, basePerNonEmpty = 2) {
  if (!Array.isArray(capacities) || capacities.length !== STRATA.length) throw new TypeError("exactly nine capacities are required");
  if (!Number.isInteger(target) || target < 0 || !Number.isInteger(basePerNonEmpty) || basePerNonEmpty < 0) throw new TypeError("target and base must be nonnegative integers");
  if (capacities.some((capacity) => !Number.isInteger(capacity) || capacity < 0)) throw new TypeError("capacities must be nonnegative integers");
  const totalCapacity = capacities.reduce((sum, value) => sum + value, 0);
  if (totalCapacity < target) throw new RangeError(`total capacity ${totalCapacity} is below target ${target}`);
  const allocation = capacities.map((capacity) => Math.min(basePerNonEmpty, capacity));
  const baseAllocation = [...allocation];
  let remaining = target - allocation.reduce((sum, value) => sum + value, 0);
  if (remaining < 0) throw new RangeError("base allocation exceeds target");
  const rounds = [];
  let roundNumber = 0;
  while (remaining > 0) {
    const active = capacities.map((capacity, index) => ({ index, capacity, residual: capacity - allocation[index], weight: capacity })).filter((entry) => entry.residual > 0);
    if (active.length === 0) throw new RangeError("no residual capacity remains");
    const denominator = active.reduce((sum, entry) => sum + entry.weight, 0);
    if (denominator <= 0) throw new RangeError("active Hamilton weights are zero");
    const before = remaining;
    const round = active.map((entry) => {
      const numerator = before * entry.weight;
      const floorQuota = Math.floor(numerator / denominator);
      const floorAward = Math.min(floorQuota, entry.residual);
      allocation[entry.index] += floorAward;
      remaining -= floorAward;
      return { ...entry, numerator, denominator, floorQuota, floorAward, remainderNumerator: numerator % denominator, remainderAward: 0 };
    });
    const ranked = round
      .filter((entry) => allocation[entry.index] < capacities[entry.index])
      .sort((left, right) => {
        const comparison = right.remainderNumerator * left.denominator - left.remainderNumerator * right.denominator;
        return comparison || left.index - right.index;
      });
    for (const entry of ranked) {
      if (remaining === 0) break;
      allocation[entry.index] += 1;
      remaining -= 1;
      entry.remainderAward = 1;
    }
    rounds.push({
      round: roundNumber += 1,
      remainingBefore: before,
      remainingAfter: remaining,
      denominator,
      cells: round.map(({ index, weight, residual, numerator, floorQuota, floorAward, remainderNumerator, remainderAward }) => ({
        stratum: STRATA[index], index, weight, residualBefore: residual, numerator, denominator, floorQuota, floorAward, remainderNumerator, remainderAward,
      })),
    });
    if (remaining === before) throw new RangeError("Hamilton round made no progress");
  }
  return {
    target,
    basePerNonEmpty,
    capacities: [...capacities],
    baseAllocation,
    finalAllocation: allocation,
    rounds,
  };
}

export function acceptedCodeSet(referenceCode) {
  if (!Object.hasOwn(TAXONOMY, referenceCode)) throw new TypeError("unknown taxonomy code");
  if (referenceCode === AMBIGUOUS_LITERAL_CODE) throw new TypeError("ambiguous literal has no metric-eligible accepted code set");
  if (STATUS_CODES.includes(referenceCode)) throw new TypeError("status code has no metric-eligible accepted code set");
  return [referenceCode];
}

export function findingMetricKey({ itemId, family, code }) {
  assertPipeSafeField(itemId, "itemId");
  if (!Object.hasOwn(TAXONOMY, code)) throw new TypeError("unknown taxonomy code");
  if (STATUS_CODES.includes(code)) throw new TypeError("status code cannot enter finding matching");
  if (code === AMBIGUOUS_LITERAL_CODE) throw new TypeError("ambiguous literal cannot enter finding matching");
  if (family !== TAXONOMY_FAMILY[code]) throw new TypeError("finding family does not match frozen taxonomy");
  assertPipeSafeField(family, "family");
  return `${itemId}|${family}|${code}`;
}

export function evaluateC0MandatoryTriggers(predicateValues) {
  if (!predicateValues || typeof predicateValues !== "object" || Array.isArray(predicateValues)) throw new TypeError("C0 predicate values must be an object");
  const triggerCodes = [];
  const evaluations = [];
  for (const [inputField, triggerCode] of C0_MANDATORY_PREDICATES) {
    const suppliedValue = predicateValues[inputField];
    const value = [true, false, "UNKNOWN"].includes(suppliedValue) ? suppliedValue : "UNKNOWN";
    const triggered = value !== false;
    evaluations.push({ inputField, triggerCode, value, triggered });
    if (triggered) triggerCodes.push(triggerCode);
  }
  const unknownFields = evaluations.filter((entry) => entry.value === "UNKNOWN").map((entry) => entry.inputField);
  return { triggerCodes, unknownFields, evaluations, randomAuditSelected: null };
}

export function reduceC0RoleOutputs(outputs) {
  if (!Array.isArray(outputs) || outputs.length !== 5) throw new TypeError("exactly five C0 role outputs are required");
  const expectedRoles = Array.from({ length: 5 }, (_, index) => `C0_PRIME_ROLE_${index + 1}`);
  if (new Set(outputs.map((output) => output?.role)).size !== 5 || expectedRoles.some((role) => !outputs.some((output) => output?.role === role))) {
    return { status: "UNRESOLVED", reason: "ROLE_SET_OR_ORDER_INVALID", severity: "UNRESOLVED", findings: [] };
  }
  const orderedOutputs = expectedRoles.map((role) => outputs.find((output) => output.role === role));
  if (orderedOutputs.some((output) => output.valid !== true || !Array.isArray(output.findings))) {
    return { status: "UNRESOLVED", reason: "INVALID_ROLE_OUTPUT", severity: "UNRESOLVED", findings: [] };
  }
  const byKey = new Map();
  for (const output of orderedOutputs) {
    const seenInRole = new Set();
    for (const finding of output.findings) {
      let key;
      try {
        key = findingMetricKey(finding);
      } catch {
        return { status: "UNRESOLVED", reason: "INVALID_OR_AMBIGUOUS_FINDING", severity: "UNRESOLVED", findings: [] };
      }
      if (finding.severity !== TAXONOMY[finding.code] || seenInRole.has(key)) {
        return { status: "UNRESOLVED", reason: "FINDING_CONFLICT_OR_DUPLICATE", severity: "UNRESOLVED", findings: [] };
      }
      seenInRole.add(key);
      const existing = byKey.get(key) ?? { ...finding, supportingRoleCount: 0 };
      existing.supportingRoleCount += 1;
      byKey.set(key, existing);
    }
  }
  const findings = [...byKey.entries()].sort(([left], [right]) => codePointCompare(left, right)).map(([, finding]) => finding);
  const severityRank = { NONE: 0, P2: 1, P1: 2, P0: 3 };
  const severity = findings.length === 0 ? "NONE" : findings.map((finding) => finding.severity).sort((left, right) => severityRank[right] - severityRank[left])[0];
  return { status: "RESOLVED", severity, findings };
}

export function bootstrapBoundedIndex({ key, metric, replicate, draw, bound }) {
  for (const [field, value] of Object.entries({ key, metric })) assertPipeSafeField(value, field);
  if (![replicate, draw, bound].every(Number.isSafeInteger) || replicate < 0 || draw < 0 || bound <= 0) throw new TypeError("invalid bootstrap index inputs");
  const range = 1n << 64n;
  const upperExclusive = range - (range % BigInt(bound));
  for (let rejection = 0; ; rejection += 1) {
    const digest = createHash("sha256").update(`${key}|${metric}|${replicate}|${draw}|${rejection}`, "utf8").digest();
    const value = digest.readBigUInt64BE(0);
    if (value < upperExclusive) return Number(value % BigInt(bound));
  }
}

export const BOOTSTRAP_GOLDEN_VECTORS = Object.freeze([
  { key: "ca60-bootstrap-prng-v1", metric: "SURFACE_SENSITIVITY", replicate: 0, draw: 0, bound: 60, expectedIndex: 8 },
  { key: "ca60-bootstrap-prng-v1", metric: "P1_RECALL", replicate: 17, draw: 8, bound: 23, expectedIndex: 13 },
  { key: "ca60-bootstrap-prng-v1", metric: "P2_MISSED_OR_UNRESOLVED_RATE", replicate: 9999, draw: 59, bound: 60, expectedIndex: 21 },
]);

export function validateSampleManifestV1(manifest) {
  const errors = [];
  if (!manifest || typeof manifest !== "object") return ["manifest must be an object"];
  if (manifest.schemaVersion !== "SampleManifestV1") errors.push("sample manifest schemaVersion mismatch");
  if (manifest.designId !== DESIGN_ID) errors.push("sample manifest designId mismatch");
  if (!/^[0-9a-f]{64}$/u.test(manifest.registrationHash ?? "")) errors.push("sample manifest registrationHash invalid");
  if (!/^[0-9a-f]{64}$/u.test(manifest.samplingFrameHash ?? "")) errors.push("sample manifest samplingFrameHash invalid");
  if (manifest.designHash !== manifest.registrationHash) errors.push("sample manifest designHash must equal registrationHash");
  if (manifest.frameHash !== manifest.samplingFrameHash) errors.push("sample manifest frameHash must equal samplingFrameHash");
  if (manifest.algorithmVersion !== SAMPLE_ALGORITHM_VERSION) errors.push("sample manifest algorithmVersion mismatch");
  if (manifest.selectionFormula !== SAMPLE_SELECTION_FORMULA) errors.push("sample manifest selection formula mismatch");
  if (manifest.allocationMethod !== "HAMILTON_LARGEST_REMAINDER_MINIMUM_TWO") errors.push("sample manifest allocation method mismatch");
  if (manifest.supersedesSampleManifestHash !== null && !/^[0-9a-f]{64}$/u.test(manifest.supersedesSampleManifestHash ?? "")) errors.push("sample manifest supersedes hash must be null or SHA-256");
  if (manifest.manifestRootTupleOrder !== "SORTED_ITEM_ID_PLUS_ITEM_HASH_PLUS_CLUSTER_ID") errors.push("sample manifest tuple-root ordering mismatch");
  if (manifest.primaryAnalysisWeight !== 1) errors.push("sample manifest primary weight must equal one");
  if (manifest.secondaryWeightMethod !== "INVERSE_INCLUSION_PROBABILITY_DESCRIPTIVE_WITH_KISH_EFFECTIVE_N") errors.push("sample manifest secondary weight method mismatch");
  if (manifest.clusterCount !== 60) errors.push("sample manifest clusterCount must equal 60");
  if (manifest.resultBlind !== true) errors.push("sample manifest must be result blind");
  if (manifest.rerollAfterAnyLabelOrResult !== false) errors.push("sample manifest reroll flag must be false");
  if (manifest.replacementAfterAnyLabelOrResult !== false) errors.push("sample manifest replacement flag must be false");
  if (!Number.isInteger(manifest.crossCellComponentCount) || manifest.crossCellComponentCount < 0) errors.push("cross-cell component count must be a nonnegative integer");
  if (manifest.clusterOwnershipRule !== "LOWEST_MEMBER_SELECTION_DIGEST_THEN_ITEM_ID") errors.push("cluster ownership rule mismatch");

  const expectedCells = RESPONSE_FORMS.flatMap((responseForm) => DIFFICULTIES.map((difficulty) => ({ responseForm, difficulty })))
    .sort((left, right) => codePointCompare(cellKey(left.responseForm, left.difficulty), cellKey(right.responseForm, right.difficulty)));
  const allocations = Array.isArray(manifest.stratumAllocations) ? manifest.stratumAllocations : [];
  if (allocations.length !== expectedCells.length) errors.push("sample manifest must encode exactly nine strata");
  const allocationByCell = new Map();
  for (const allocation of allocations) {
    const key = cellKey(allocation?.responseForm, allocation?.difficulty);
    if (allocationByCell.has(key)) errors.push(`duplicate stratum allocation ${key}`);
    allocationByCell.set(key, allocation);
  }
  for (const cell of expectedCells) {
    if (!allocationByCell.has(cellKey(cell.responseForm, cell.difficulty))) errors.push(`missing stratum ${cellKey(cell.responseForm, cell.difficulty)}`);
  }
  const eligibleTotal = allocations.reduce((sum, allocation) => sum + (Number.isInteger(allocation?.eligibleClusterCount) ? allocation.eligibleClusterCount : 0), 0);
  if (manifest.totalEligibleClusterCount !== eligibleTotal) errors.push("total eligible cluster count mismatch");
  if (allocations.some((allocation) => !Number.isInteger(allocation?.eligibleClusterCount) || allocation.eligibleClusterCount < 0)) errors.push("eligible cluster counts must be nonnegative integers");
  let hamilton = null;
  try {
    hamilton = computeCapacityConstrainedHamilton(STRATA.map((stratum) => allocationByCell.get(stratum)?.eligibleClusterCount ?? -1), 60, 2);
  } catch (error) {
    errors.push(`Hamilton allocation frame is infeasible: ${error.message}`);
  }
  const expectedParts = STRATA.map((stratum, index) => ({
    key: stratum,
    allocation: allocationByCell.get(stratum),
    base: hamilton?.baseAllocation[index],
    final: hamilton?.finalAllocation[index],
  }));
  for (const part of expectedParts) {
    if (!part.allocation) continue;
    if (part.allocation.baseMinimumAllocation !== part.base) errors.push(`${part.key} minimum allocation mismatch`);
    if (part.allocation.finalAllocation !== part.final) errors.push(`${part.key} final allocation mismatch`);
    if (part.final > part.allocation.eligibleClusterCount) errors.push(`${part.key} allocation exceeds eligibility`);
  }
  if (hamilton && canonicalJson(manifest.hamiltonAudit) !== canonicalJson(hamilton.rounds)) errors.push("Hamilton exact rational audit mismatch");
  const rows = Array.isArray(manifest.selectedRows) ? manifest.selectedRows : [];
  if (rows.length !== 60) errors.push("sample manifest must contain exactly 60 selected rows");
  const clusterIds = rows.map((row) => row?.clusterId);
  if (new Set(clusterIds).size !== 60 || clusterIds.some((id) => typeof id !== "string" || id.length === 0)) errors.push("sample manifest must contain exactly 60 unique cluster IDs");
  const observedByCell = new Map();
  for (const row of rows) {
    const key = cellKey(row?.responseForm, row?.difficulty);
    observedByCell.set(key, (observedByCell.get(key) ?? 0) + 1);
    if (row?.stratum !== key) errors.push(`stratum mismatch for ${row?.clusterId ?? "unknown"}`);
    if (!/^[0-9a-f]{64}$/u.test(row?.itemHash ?? "")) errors.push(`itemHash mismatch for ${row?.clusterId ?? "unknown"}`);
    if (!Number.isFinite(row?.inclusionProbability) || row.inclusionProbability <= 0 || row.inclusionProbability > 1) errors.push(`inclusion probability mismatch for ${row?.clusterId ?? "unknown"}`);
    if (row?.analysisWeight !== 1) errors.push(`primary analysis weight mismatch for ${row?.clusterId ?? "unknown"}`);
    let expectedDigest = null;
    try {
      expectedDigest = selectionDigestV2({ designHash: manifest.designHash, frameHash: manifest.frameHash, algorithmVersion: manifest.algorithmVersion, stratum: row?.stratum, clusterId: row?.clusterId, itemHash: row?.itemHash });
      assertPipeSafeField(row?.itemId, "itemId");
    } catch (error) {
      errors.push(error.message);
    }
    if (row?.selectionDigest !== expectedDigest) errors.push(`selection digest mismatch for ${row?.clusterId ?? "unknown"}`);
  }
  for (const part of expectedParts) {
    if (!part.allocation) continue;
    if ((observedByCell.get(part.key) ?? 0) !== part.allocation.finalAllocation) errors.push(`${part.key} selected row count mismatch`);
  }
  const expectedOrder = [...rows].sort((left, right) => codePointCompare(left.stratum, right.stratum) || codePointCompare(left.selectionDigest, right.selectionDigest) || codePointCompare(left.itemId, right.itemId));
  if (rows.some((row, index) => row !== expectedOrder[index])) errors.push("selected rows must be ranked by assigned stratum, selection digest, then itemId");
  if (manifest.sampleManifestHash !== calculateArtifactHash(manifest, "sampleManifestHash")) errors.push("sampleManifestHash mismatch");
  return [...new Set(errors)];
}

export function validateFinalEvaluationReceiptV1(receipt) {
  const errors = [];
  if (!receipt || typeof receipt !== "object") return ["final evaluation receipt must be an object"];
  if (receipt.schemaVersion !== "FinalEvaluationReceiptV1") errors.push("final receipt schemaVersion mismatch");
  if (receipt.designId !== DESIGN_ID) errors.push("final receipt designId mismatch");
  if (receipt.expectedSampleSize !== 60) errors.push("final receipt expected sample size must be 60");
  for (const field of ["registrationHash", "frameRegistrationHash", "sampleManifestHash", "referenceSealHash", "executionRegistrationHash", "attemptChainHeadHash", "itemResultSetHash", "findingMatchingMatrixHash", "clusterStrataWeightSummaryHash"]) {
    if (!/^[0-9a-f]{64}$/u.test(receipt[field] ?? "")) errors.push(`${field} must be SHA-256`);
  }
  if (!Array.isArray(receipt.authorizationHashes) || receipt.authorizationHashes.length !== 2 || new Set(receipt.authorizationHashes).size !== 2 || receipt.authorizationHashes.some((value) => !/^[0-9a-f]{64}$/u.test(value))) errors.push("exactly two unique authorization hashes are required");
  const countFields = ["completedItemCount", "failedItemCount", "missingItemCount", "resolvedPositiveN", "resolvedNegativeN", "unresolvedN", "invalidN"];
  for (const field of countFields) {
    if (!Number.isInteger(receipt[field]) || receipt[field] < 0 || receipt[field] > 60) errors.push(`${field} must be an integer from 0 through 60`);
  }
  const completed = receipt.completedItemCount;
  const countSum = receipt.resolvedPositiveN + receipt.resolvedNegativeN + receipt.unresolvedN + receipt.invalidN;
  if (countSum !== completed) errors.push("resolved and unresolved counts must equal completed item count");
  if (completed + receipt.failedItemCount + receipt.missingItemCount !== 60) errors.push("completed, failed, and missing item counts must equal 60");
  const expectedCompletion = completed === 60 && receipt.failedItemCount === 0 && receipt.missingItemCount === 0 ? "COMPLETE_60" : "INCOMPLETE";
  if (receipt.completionStatus !== expectedCompletion) errors.push("completion status mismatch");
  const matrix = receipt.confusionMatrix;
  if (!matrix || ["tp", "fp", "fn", "tn"].some((field) => !Number.isInteger(matrix?.[field]) || matrix[field] < 0 || matrix[field] > 60)) errors.push("confusion matrix counts are invalid");
  else {
    if (matrix.tp + matrix.fn !== receipt.resolvedPositiveN) errors.push("positive denominator does not match TP+FN");
    if (matrix.tn + matrix.fp !== receipt.resolvedNegativeN) errors.push("negative denominator does not match TN+FP");
  }

  const requiredMetricNames = ["SURFACE_SENSITIVITY", "SPECIFICITY", "FALSE_POSITIVE_RATE", "FAMILY_RECALL", "EXACT_CODE_AND_FAMILY_RECALL", "FAMILY_PRECISION", "EXACT_CODE_PRECISION", "FALSE_FINDINGS_PER_100", "P0_FALSE_NEGATIVE_COUNT", "P1_RECALL", "P2_MISSED_OR_UNRESOLVED_RATE"];
  const metricResults = Array.isArray(receipt.metricResults) ? receipt.metricResults : [];
  const metricByName = new Map();
  for (const metric of metricResults) {
    if (metricByName.has(metric?.metric)) errors.push(`duplicate metric result ${metric?.metric}`);
    metricByName.set(metric?.metric, metric);
    if (!Number.isInteger(metric?.numerator) || metric.numerator < 0 || !Number.isInteger(metric?.denominator) || metric.denominator < 0 || metric.numerator > metric.denominator) errors.push(`${metric?.metric ?? "unknown"} numerator/denominator invalid`);
    if (!["MET", "NOT_MET", "UNDERPOWERED"].includes(metric?.status)) errors.push(`${metric?.metric ?? "unknown"} status invalid`);
    if (metric?.denominator === 0 && metric?.pointEstimate !== null) errors.push(`${metric?.metric ?? "unknown"} point estimate must be null without denominator`);
    if (metric?.denominator > 0 && (!Number.isFinite(metric?.pointEstimate) || metric.pointEstimate < 0)) errors.push(`${metric?.metric ?? "unknown"} point estimate invalid`);
    for (const boundField of ["oneSidedWilsonLcb95", "oneSidedWilsonUcb95", "twoSidedWilsonL95", "twoSidedWilsonU95", "clusterBootstrapP5", "clusterBootstrapP95", "worstCaseMissingLower", "worstCaseMissingUpper", "conservativeDecisionBound"]) {
      const value = metric?.[boundField];
      if (value !== null && (!Number.isFinite(value) || value < 0 || value > 1)) errors.push(`${metric?.metric ?? "unknown"} ${boundField} invalid`);
    }
    if (metric?.oneSidedWilsonLcb95 !== null && metric?.oneSidedWilsonUcb95 !== null && metric.oneSidedWilsonLcb95 > metric.oneSidedWilsonUcb95) errors.push(`${metric.metric} Wilson bounds inverted`);
  }
  for (const metricName of requiredMetricNames) if (!metricByName.has(metricName)) errors.push(`missing metric result ${metricName}`);

  const minimumRule = (metricName, target, minimumN) => {
    const metric = metricByName.get(metricName);
    if (!metric) return;
    let expected = "UNDERPOWERED";
    if (metric.denominator >= minimumN && metric.conservativeDecisionBound !== null) {
      if (metric.conservativeDecisionBound >= target) expected = "MET";
      else if (metric.oneSidedWilsonUcb95 !== null && metric.oneSidedWilsonUcb95 < target) expected = "NOT_MET";
    }
    if (metric.status !== expected) errors.push(`${metricName} threshold status mismatch`);
  };
  const maximumRule = (metricName, target, minimumN) => {
    const metric = metricByName.get(metricName);
    if (!metric) return;
    let expected = "UNDERPOWERED";
    if (metric.denominator >= minimumN && metric.conservativeDecisionBound !== null) {
      if (metric.conservativeDecisionBound <= target) expected = "MET";
      else if (metric.oneSidedWilsonLcb95 !== null && metric.oneSidedWilsonLcb95 > target) expected = "NOT_MET";
    }
    if (metric.status !== expected) errors.push(`${metricName} threshold status mismatch`);
  };
  minimumRule("SURFACE_SENSITIVITY", 0.9, 25);
  minimumRule("SPECIFICITY", 0.95, 52);
  maximumRule("FALSE_POSITIVE_RATE", 0.05, 52);
  minimumRule("FAMILY_RECALL", 0.85, 16);
  minimumRule("EXACT_CODE_AND_FAMILY_RECALL", 0.85, 16);
  minimumRule("P1_RECALL", 0.9, 25);
  maximumRule("P2_MISSED_OR_UNRESOLVED_RATE", 0.1, 25);
  const p0 = metricByName.get("P0_FALSE_NEGATIVE_COUNT");
  if (p0) {
    const expected = p0.numerator > 0 ? "NOT_MET" : p0.denominator >= 59 ? "MET" : "UNDERPOWERED";
    if (p0.status !== expected) errors.push("P0_FALSE_NEGATIVE_COUNT threshold status mismatch");
  }
  for (const descriptiveName of ["FAMILY_PRECISION", "EXACT_CODE_PRECISION", "FALSE_FINDINGS_PER_100"]) {
    if (metricByName.get(descriptiveName)?.decisionEligible !== false) errors.push(`${descriptiveName} must remain descriptive only`);
  }

  const execution = receipt.executionSummary;
  if (!execution || execution.attempts > 1460 || execution.totalTokens > 10000000 || execution.estimatedUsd > 50 || execution.invoiceIsAuthoritative !== true) errors.push("combined execution cap or invoice-authority mismatch");
  const providerMismatch = !Array.isArray(receipt.requestedObservedProviderModels) || receipt.requestedObservedProviderModels.length !== 2 || receipt.requestedObservedProviderModels.some((entry) => entry?.requestedProvider !== entry?.observedProvider || entry?.requestedModel !== entry?.observedModel || !entry?.requestedEndpoint?.includes(entry?.observedEndpointHostname));
  const unresolvedOverflow = receipt.unresolvedN + receipt.invalidN > 3;
  const integrityFailure = receipt.executionIntegrityStatus === "FAILED" || expectedCompletion !== "COMPLETE_60" || unresolvedOverflow || providerMismatch || !execution || execution.attempts > 1460 || execution.totalTokens > 10000000 || execution.estimatedUsd > 50;
  if (receipt.executionIntegrityStatus === "INTACT" && integrityFailure) errors.push("execution integrity status must be FAILED");
  if (receipt.decisionCeiling !== "INCONCLUSIVE_MACHINE_REFERENCE") errors.push("final receipt decision ceiling mismatch");
  if (receipt.claimCeiling !== "CALIFORNIA_RUNTIME_EGRESS_ELIGIBLE_MACHINE_REFERENCE_PILOT_ONLY") errors.push("final receipt claim ceiling mismatch");
  const allowedConclusions = ["INVALID_FOR_GENERALIZATION", "EXECUTION_INTEGRITY_FAILED", "POLICY_REVISION_REQUIRED_MACHINE_REFERENCE", "INCONCLUSIVE_MACHINE_REFERENCE"];
  if (!allowedConclusions.includes(receipt.conclusion)) errors.push("final receipt conclusion is not allowed for CA60");
  const minimumPolicyTargets = [["SURFACE_SENSITIVITY", 0.9], ["FAMILY_RECALL", 0.85], ["EXACT_CODE_AND_FAMILY_RECALL", 0.85], ["SPECIFICITY", 0.95], ["P1_RECALL", 0.9]];
  const maximumPolicyTargets = [["FALSE_POSITIVE_RATE", 0.05], ["P2_MISSED_OR_UNRESOLVED_RATE", 0.1]];
  const policyTrigger = (p0?.numerator ?? 0) > 0
    || minimumPolicyTargets.some(([name, target]) => (metricByName.get(name)?.oneSidedWilsonUcb95 ?? 1) < target)
    || maximumPolicyTargets.some(([name, target]) => (metricByName.get(name)?.oneSidedWilsonLcb95 ?? 0) > target);
  if (receipt.policyRevisionRequired !== policyTrigger) errors.push("policyRevisionRequired does not match decisive wrong-side bounds");
  const materialDeviation = Array.isArray(receipt.deviations) && receipt.deviations.some((deviation) => deviation?.material === true);
  let expectedConclusion = "INCONCLUSIVE_MACHINE_REFERENCE";
  if (receipt.generalizationRequested === true || materialDeviation) expectedConclusion = "INVALID_FOR_GENERALIZATION";
  else if (integrityFailure) expectedConclusion = "EXECUTION_INTEGRITY_FAILED";
  else if (policyTrigger) expectedConclusion = "POLICY_REVISION_REQUIRED_MACHINE_REFERENCE";
  if (receipt.conclusion !== expectedConclusion) errors.push(`final receipt conclusion must be ${expectedConclusion}`);
  if (receipt.receiptHash !== calculateArtifactHash(receipt, "receiptHash")) errors.push("final receipt hash mismatch");
  return [...new Set(errors)];
}

export function validateMachineReferenceLabelV1(label) {
  const errors = [];
  if (!label || typeof label !== "object") return ["machine-reference label must be an object"];
  if (label.schemaVersion !== "MachineReferenceLabelV1") errors.push("machine-reference schemaVersion mismatch");
  if (label.designId !== DESIGN_ID) errors.push("machine-reference designId mismatch");
  if (label.referenceSourceType !== "MACHINE_REFERENCE_PANEL") errors.push("reference source must be MACHINE_REFERENCE_PANEL");
  if (label.humanReferenceClaimAllowed !== false) errors.push("human reference claims must remain disabled");
  if (label.requestedProvider !== "ALIBABA_CLOUD_MODEL_STUDIO" || label.observedProvider !== "ALIBABA_CLOUD_MODEL_STUDIO") errors.push("machine-reference provider must be Alibaba Cloud Model Studio");
  if (label.requestedModel !== "qwen3.8-max" || label.observedModel !== "qwen3.8-max") errors.push("machine-reference model must be requested and observed as qwen3.8-max");
  for (const field of ["registrationHash", "sampleManifestHash", "promptHash", "schemaHash", "inputReceiptHash", "solveAttemptReceiptHash", "labelAttemptReceiptHash"]) {
    if (!/^[0-9a-f]{64}$/u.test(label[field] ?? "")) errors.push(`${field} must be SHA-256`);
  }
  if (label.blindingAttestations?.deepSeekOutputNotSeen !== true) errors.push("DeepSeek output blinding attestation is required");
  const validatePayload = (codes, binaryLabel, severity, prefix) => {
    if (!Array.isArray(codes) || codes.length === 0 || new Set(codes).size !== codes.length || codes.some((code) => !Object.hasOwn(TAXONOMY, code))) {
      errors.push(`${prefix} taxonomy codes are incomplete, duplicated, or unknown`);
      return;
    }
    const severityRank = { NONE: 0, UNRESOLVED: 1, P2: 2, P1: 3, P0: 4 };
    const expectedSeverity = codes.map((code) => TAXONOMY[code]).sort((left, right) => severityRank[right] - severityRank[left])[0];
    const expectedLabel = codes.includes("SCHEMA_GAP") || codes.includes("UNASSESSABLE") ? "UNRESOLVED_REFERENCE" : codes.some((code) => ["P0", "P1", "P2"].includes(TAXONOMY[code])) ? "DEFECT" : "NO_FINDING";
    if (severity !== expectedSeverity) errors.push(`${prefix} highest-severity mapping mismatch`);
    if (binaryLabel !== expectedLabel) errors.push(`${prefix} binary label mapping mismatch`);
    const familyMap = label[`${prefix}FindingFamilies`];
    if (canonicalJson(Object.keys(familyMap ?? {}).sort()) !== canonicalJson([...codes].sort())) errors.push(`${prefix} family-map keys must exactly equal label codes`);
    for (const code of codes) if (label[`${prefix}FindingFamilies`]?.[code] !== TAXONOMY_FAMILY[code]) errors.push(`${prefix} family mapping mismatch for ${code}`);
  };
  if (label.labelStage === "RAW_RATER") {
    if (!["A_LABEL", "B_LABEL"].includes(label.role)) errors.push("raw labels require A_LABEL or B_LABEL role");
    if (typeof label.raterPseudonym !== "string" || label.raterPseudonym.length === 0) errors.push("raw label rater pseudonym is required");
    if (label.adjudicatorPseudonym !== null) errors.push("raw label cannot name an adjudicator");
    if (label.blindingAttestations?.otherRaterLabelNotSeen !== true) errors.push("raw labeler must attest the other label was not seen");
    if (label.blindingAttestations?.adjudicatorInputsLimitedToItemAndRawLabels !== null) errors.push("raw label cannot make adjudicator-input attestation");
    if (!BINARY_LABELS.includes(label.rawLabel) || !SEVERITIES.includes(label.rawSeverity) || !label.rawFindingFamilies || typeof label.rawFindingFamilies !== "object") errors.push("raw label payload is incomplete");
    else validatePayload(label.rawTaxonomyCodes, label.rawLabel, label.rawSeverity, "raw");
    if (typeof label.rawUncertain !== "boolean") errors.push("raw label uncertainty flag is required");
    const rawForcesAdjudication = label.rawUncertain === true || label.rawTaxonomyCodes?.includes(AMBIGUOUS_LITERAL_CODE) || label.rawTaxonomyCodes?.some((code) => ["P0", "P1"].includes(TAXONOMY[code]));
    if (label.requiresAdjudication !== rawForcesAdjudication) errors.push("raw adjudication requirement mismatch");
    if (label.finalLabel !== null || label.finalSeverity !== null || !Array.isArray(label.finalTaxonomyCodes) || label.finalTaxonomyCodes.length !== 0 || label.finalFindingFamilies !== null) errors.push("raw label cannot contain final adjudication values");
    if (!Array.isArray(label.acceptedCodeSets) || label.acceptedCodeSets.length !== 0) errors.push("raw label cannot contain accepted metric code sets");
    if (!Array.isArray(label.rawLabelHashes) || label.rawLabelHashes.length !== 0 || label.disagreementStatus !== null || label.disagreementAdjudicationReceiptHash !== null || !Array.isArray(label.adjudicationReasonCodes) || label.adjudicationReasonCodes.length !== 0) errors.push("raw label cannot contain final lineage");
  } else if (label.labelStage === "FINAL_ADJUDICATED") {
    if (label.role !== "ADJUDICATOR") errors.push("final labels require ADJUDICATOR role");
    if (label.raterPseudonym !== null) errors.push("final label cannot use a raw-rater pseudonym");
    if (typeof label.adjudicatorPseudonym !== "string" || label.adjudicatorPseudonym.length === 0) errors.push("final label adjudicator pseudonym is required");
    if (label.blindingAttestations?.otherRaterLabelNotSeen !== null || label.blindingAttestations?.adjudicatorInputsLimitedToItemAndRawLabels !== true) errors.push("final adjudicator blinding attestations are incomplete");
    if (label.rawLabel !== null || label.rawSeverity !== null || !Array.isArray(label.rawTaxonomyCodes) || label.rawTaxonomyCodes.length !== 0 || label.rawFindingFamilies !== null || label.rawUncertain !== null) errors.push("final label cannot overwrite raw label fields");
    if (!BINARY_LABELS.includes(label.finalLabel) || !SEVERITIES.includes(label.finalSeverity) || !label.finalFindingFamilies || typeof label.finalFindingFamilies !== "object") errors.push("final adjudicated payload is incomplete");
    else validatePayload(label.finalTaxonomyCodes, label.finalLabel, label.finalSeverity, "final");
    if (!Array.isArray(label.rawLabelHashes) || label.rawLabelHashes.length !== 2 || new Set(label.rawLabelHashes).size !== 2 || label.rawLabelHashes.some((value) => !/^[0-9a-f]{64}$/u.test(value))) errors.push("final label must bind two unique raw label hashes");
    if (!["AGREEMENT", "DISAGREEMENT", "ADJUDICATOR_UNDECIDED"].includes(label.disagreementStatus)) errors.push("final disagreement status is required");
    if (label.disagreementStatus === "ADJUDICATOR_UNDECIDED" && label.finalLabel !== "UNRESOLVED_REFERENCE") errors.push("undecided adjudication must remain UNRESOLVED_REFERENCE");
    if (!/^[0-9a-f]{64}$/u.test(label.disagreementAdjudicationReceiptHash ?? "")) errors.push("final disagreement/adjudication receipt hash is required");
    if (!Array.isArray(label.adjudicationReasonCodes)) errors.push("final adjudication reasons are required");
    const ambiguousReason = label.adjudicationReasonCodes?.includes("AMBIGUOUS_LITERAL_CODE_FALSE_ACCEPT_CORRECT_RESPONSE") === true;
    if (ambiguousReason) {
      if (label.requiresAdjudication !== true || label.finalLabel !== "UNRESOLVED_REFERENCE" || label.finalSeverity !== "UNRESOLVED" || canonicalJson(label.finalTaxonomyCodes) !== canonicalJson(["SCHEMA_GAP"])) errors.push("ambiguous literal must resolve only to SCHEMA_GAP plus UNRESOLVED_REFERENCE");
    }
    if (label.finalTaxonomyCodes?.includes(AMBIGUOUS_LITERAL_CODE)) errors.push("ambiguous literal is forbidden in final labels");
    if (!Array.isArray(label.acceptedCodeSets)) errors.push("accepted code sets are required");
    const expectedAccepted = (label.finalTaxonomyCodes ?? []).filter((code) => !STATUS_CODES.includes(code) && code !== AMBIGUOUS_LITERAL_CODE).map((code) => ({ primaryCode: code, family: TAXONOMY_FAMILY[code], acceptedCodes: [code] }));
    if (canonicalJson(label.acceptedCodeSets ?? null) !== canonicalJson(expectedAccepted)) errors.push("accepted code sets must be sorted singleton primary-code mappings");
  } else {
    errors.push("labelStage must be RAW_RATER or FINAL_ADJUDICATED");
  }
  if (label.labelHash !== calculateArtifactHash(label, "labelHash")) errors.push("machine-reference label hash mismatch");
  return [...new Set(errors)];
}

export function buildDesignRegistration() {
  const cells = RESPONSE_FORMS.flatMap((responseForm) => DIFFICULTIES.map((difficulty) => ({ responseForm, difficulty })));
  return {
    schemaVersion: SCHEMA_VERSION,
    designId: DESIGN_ID,
    designKind: "IMMUTABLE_PRE_EXECUTION_DESIGN_REGISTRATION",
    version: DESIGN_VERSION,
    frozenAt: FREEZE_TIMESTAMP,
    baselineCommitSha: BASELINE_SHA,
    supersedes: {
      schemaVersion: "NaturalCaPilotDesignRegistrationV1",
      designId: "MAIS-NATURAL-CA60-V1",
      version: 1,
      registrationHash: PREDECESSOR_REGISTRATION_HASH,
      artifactPath: "design-registration.json",
      reason: "Pre-frame source-module edges produced three oversized components and required append-only redesign before frame freeze.",
    },
    provenance: {
      preservedPriorNaturalDesignSha256: PRIOR_NATURAL_DESIGN_SHA256,
      preservationArchiveSha256: PRESERVATION_ARCHIVE_SHA256,
      priorThreeRegionPlanStatus: "SUPERSEDED_NOT_EXECUTED",
    },
    scope: {
      jurisdiction: "CALIFORNIA",
      framePopulation: "ALL_CA_RUNTIME_VISIBLE_QUESTIONS",
      estimandPopulation: "EGRESS_ELIGIBLE_CA_RUNTIME_VISIBLE_QUESTIONS",
      estimandLimitation: "Inference applies only to the provider-egress-eligible subset of the frozen California runtime-visible frame.",
      samplingUnit: "distinct homology cluster",
      targetClusterCount: 60,
      claimBasis: "MACHINE_REFERENCE_ONLY",
      humanGoldClaim: false,
      claimCeiling: "INCONCLUSIVE_MACHINE_REFERENCE",
      forbiddenClaims: ["PASS", "APPROVED", "PRODUCTION", "PROMOTION"],
    },
    runtimePopulation: {
      sourceCommit: BASELINE_SHA,
      questionStoreContract: "lib/server/questionStore.ts runtime filtering, deduplication, profile, feature-state, and public-projection semantics",
      curriculumProfile: "US_CA_MATH",
      actor: "AUTHENTICATED_STUDENT",
      gradeProjectionCount: 13,
      gradeProjections: ["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
      projectionCombination: "SET_UNION_BY_STABLE_RUNTIME_QUESTION_ID_BEFORE_ID_COLLISION_AUDIT",
      maxAnswerChoices: 0,
      accommodationOptionTruncation: false,
      runtimeConfigHashBoundLater: true,
      runtimeConfigHashMustBind: ["sourceCommit", "curriculumProfile", "actor", "gradeProjections", "maxAnswerChoices", "accommodationOptionTruncation", "activePackState", "featureFlagState"],
    },
    eligibility: {
      inclusion: [
        "Stable runtime question ID exists.",
        "Item serializes under the frozen canonical JSON schema.",
        "Response form is multiple-choice, fill-in, or short-answer.",
        "Prompt contains enough content for mathematical review.",
        "Egress screen confirms no personal data, secrets, internal paths, or unauthorized restricted content.",
      ],
      exclusion: [
        "Non-California track.",
        "Not visible under the frozen runtime configuration.",
        "Synthetic, test, or candidate-only content.",
        "PII, credential, internal path, or restricted egress content.",
        "Unstable serialization or a read crash.",
      ],
      exclusionCodes: [
        "NON_CALIFORNIA_TRACK",
        "NOT_VISIBLE_IN_FROZEN_RUNTIME_CONFIG",
        "SYNTHETIC_TEST_OR_CANDIDATE_ONLY",
        "PII_CREDENTIAL_INTERNAL_PATH_OR_RESTRICTED_EGRESS",
        "UNSTABLE_SERIALIZATION_OR_READ_CRASH",
      ],
      exclusionListClosed: true,
      noImputation: true,
      missingAnswerOptionsExplanationRemainIncluded: true,
      unresolvedFrameSerializationFailureDisposition: "BLOCK_FRAME_FREEZE",
      allowedResponseForms: [...RESPONSE_FORMS],
      allowedDifficulties: [...DIFFICULTIES],
      frameFailureLedgerRequired: true,
    },
    stratification: {
      responseForms: [...RESPONSE_FORMS],
      difficulties: [...DIFFICULTIES],
      difficultyRuntimeMapping: [
        { runtimeValue: "Low", frozenStratumValue: "Low" },
        { runtimeValue: "Medium", frozenStratumValue: "Medium" },
        { runtimeValue: "High", frozenStratumValue: "High" },
      ],
      cells,
      allocation: {
        method: "CAPACITY_CONSTRAINED_HAMILTON_LARGEST_REMAINDER_MINIMUM_TWO",
        totalClusters: 60,
        baseRule: "base_i=min(2,capacity_i); capacity-one cells are legal and receive one",
        weights: "original eligible independent cluster counts in uniquely assigned cells",
        residualRule: "cap extras at residual capacity and repeatedly redistribute overflow using original weights",
        arithmetic: "exact integer numerator/denominator and cross-multiplied remainder comparisons",
        tieBreakOrder: [...STRATA],
        emptyStratumAllocation: 0,
        failWhenTotalCapacityBelow: 60,
      },
    },
    homologyClustering: {
      normalization: "UNICODE_NFKC",
      representation: "template skeleton with case-folding, whitespace collapse, numeric literal slots, and option-order normalization",
      edgeTypes: {
        exact: "JCS_SHA256_OF_PROMPT_OPTIONS_STORED_ANSWER_ACCEPTED_ANSWERS_EXPLANATION",
        template: "NFKC_CASE_SPACE_PUNCTUATION_LATEX_NORMALIZATION_WITH_TYPED_LITERAL_PLACEHOLDERS_PRESERVING_OPERATORS_RELATIONS_RESPONSE_FORM_TOPIC",
        near: "TRIGRAM_JACCARD_AND_NORMALIZED_EDIT_BOTH_MEET_THRESHOLDS",
        sourceLineage: "NON_NULL_EXPLICIT_FINE_GRAINED_LINEAGE_KEY_EQUALITY_ONLY",
      },
      sourceLineageKeys: {
        K5: ["batchId", "clusterId", "topicId", "responseForm"],
        G6_12: ["batchId", "generationTemplate", "topicId", "responseForm"],
        CCSS: ["batchId", "sourceLessonSlug", "topicId", "responseForm"],
      },
      provenanceOnlyNeverEdges: ["packageId", "batchId", "sourceIds", "sourceModule"],
      provenanceAuditFieldsNeverCreateEdges: true,
      missingLineage: null,
      inferredSourceEdgesAllowed: false,
      similarity: {
        trigramJaccardAtLeast: 0.9,
        normalizedEditSimilarityAtLeast: 0.92,
        edgeRule: "BOTH_THRESHOLDS_REQUIRED",
        componentRule: "UNDIRECTED_CONNECTED_COMPONENT",
      },
      blockers: {
        frameShareStrictlyGreaterThan: 0.05,
        topicBridgeCountStrictlyGreaterThan: 2,
        disposition: "BLOCK_ENTIRE_FRAME_FREEZE_AND_VERSION_DESIGN",
      },
      preflightCorrectionEvidence: "preflight-oversized-components-aggregate.json",
      requiredAuditOutputs: ["clusterCount", "singletonRate", "largest20Components", "clusterSizeDistribution", "anomalyLedger"],
      eligibleItemClusterCardinality: "EXACTLY_ONE",
    },
    deterministicSelection: {
      hashAlgorithm: "SHA-256",
      formula: SAMPLE_SELECTION_FORMULA,
      algorithmVersion: SAMPLE_ALGORITHM_VERSION,
      byteSerialization: "UTF-8 of six case-preserved pipe-free fields joined with literal | and no whitespace",
      forbiddenDelimiterInFields: "|",
      stratumSerialization: "responseForm::difficulty using frozen runtime values",
      crossCellClusterOwnership: "Compute each eligible member digest; lowest digest, then lexicographic itemId, is the sole representative and assigns the whole cluster to that member's one stratum.",
      hamiltonEligibleCounts: "Count each cluster exactly once in its assigned stratum.",
      withinStratumOrdering: "ascending selectionDigest then lexicographic itemId; select at most one item per cluster",
      crossCellComponentCountRequiredInAuditLedger: true,
      resultBlind: true,
      rerollAfterAnyLabelOrResult: false,
      replacementAfterAnyLabelOrResult: false,
      preResultReplacementRule: "RECORDED_CLOSED_EXCLUSION_NEXT_RANK_NEW_SAMPLE_VERSION_WITH_SUPERSEDES",
    },
    machineReferenceWorkflow: {
      labelSourceType: "machine_reference_panel",
      referenceProvider: { provider: "ALIBABA_CLOUD_MODEL_STUDIO", requestedModel: "qwen3.8-max", observedModelRequired: "qwen3.8-max", requestedSeed: null, role: "MACHINE_REFERENCE_PANEL" },
      evaluatedProvider: { provider: "DEEPSEEK_DIRECT", model: "deepseek-v4-pro", role: "EVALUATED_PROVIDER" },
      panelRoleOrder: ["A_SOLVE", "A_LABEL", "B_SOLVE", "B_LABEL", "ADJUDICATOR"],
      labelProductionOrder: ["A_SOLVE", "A_LABEL", "B_SOLVE", "B_LABEL", "ADJUDICATOR"],
      roleInputAllowlists: {
        A_SOLVE: ["prompt", "options", "locale", "responseForm"],
        A_LABEL: ["prompt", "options", "locale", "responseForm", "A_SOLVE_RECEIPT", "storedAnswer", "acceptedAnswers", "explanation"],
        B_SOLVE: ["prompt", "options", "locale", "responseForm"],
        B_LABEL: ["prompt", "options", "locale", "responseForm", "B_SOLVE_RECEIPT", "storedAnswer", "acceptedAnswers", "explanation"],
        ADJUDICATOR: ["item", "A_SOLVE_RECEIPT", "A_LABEL_RECEIPT", "B_SOLVE_RECEIPT", "B_LABEL_RECEIPT"],
      },
      roleInputDenylist: ["DEEPSEEK_OUTPUT", "OTHER_ITEM", "CREDENTIAL", "SOURCE_PATH", "GIT_METADATA", "STUDENT_OR_USER_DATA", "UNAUTHORIZED_COPYRIGHT_CONTENT"],
      separation: "The final machine-reference panel label is sealed before any DeepSeek evaluated output; raw A and B labels are mutually blinded and the adjudicator sees only this item plus A/B solve and label receipts.",
      humanGold: false,
      humanLabelersAllowed: false,
      finalSealRequiresTwoRawLabelHashes: true,
      correlatedSameModelErrorRisk: true,
      agreementDoesNotEstablishHumanValidity: true,
    },
    taxonomy: {
      codes: Object.keys(TAXONOMY),
      codesByFamily: {
        P0: Object.keys(TAXONOMY).filter((code) => TAXONOMY[code] === "P0"),
        P1: Object.keys(TAXONOMY).filter((code) => TAXONOMY[code] === "P1"),
        P2: Object.keys(TAXONOMY).filter((code) => TAXONOMY[code] === "P2"),
        NON_DEFECT_OR_STATUS: ["NO_FINDING", "UNASSESSABLE", "SCHEMA_GAP"],
      },
      severityByCode: { ...TAXONOMY },
      familyByCode: { ...TAXONOMY_FAMILY },
      families: [...TAXONOMY_FAMILIES],
      frozenCodeSortOrder: Object.keys(TAXONOMY),
      binaryLabels: [...BINARY_LABELS],
      severities: [...SEVERITIES],
      defectCodes: Object.keys(TAXONOMY).filter((code) => ["P0", "P1", "P2"].includes(TAXONOMY[code])),
      nonDefectCodes: ["NO_FINDING"],
      unresolvedCodes: ["UNASSESSABLE", "SCHEMA_GAP"],
      highestSeverityWinsAndAllCodesRetained: true,
      acceptedCodeMapping: "SORTED_SINGLETON_IDENTITY_ONLY_EXCEPT_RESERVED_AMBIGUOUS_LITERAL",
      acceptedCodeSetFormula: "For a metric-eligible primary defect code: sort([primaryCode]); exactly one code; same frozen family; statuses and reserved ambiguous literal are ineligible.",
      acceptedCodeSetShape: "SORTED_SINGLETON_PRIMARY_CODE_SAME_FAMILY",
      mappingExpansionRequiresNewDesignVersion: true,
      ambiguousLiteral: { FALSE_ACCEPT_CORRECT_RESPONSE: "RESERVED_AMBIGUOUS_LITERAL_REQUIRES_SCHEMA_GAP_AND_ADJUDICATION_UNTIL_NEW_DESIGN" },
      ambiguousLiteralFinalDisposition: "SCHEMA_GAP_PLUS_UNRESOLVED_REFERENCE",
      ambiguousLiteralMetricCreditAllowed: false,
      unknownCodeDisposition: "SCHEMA_GAP",
      schemaGapOrUndecidedDisposition: "UNRESOLVED_REFERENCE",
      statusCodesEnterFindingMatching: false,
      findingMetricKey: "UNIQUE(itemId,family,code)",
    },
    labeling: {
      rawLabelImmutable: true,
      finalLabelSeparateFromRaw: true,
      allowedMachinePanelRoles: ["A_SOLVE", "A_LABEL", "B_SOLVE", "B_LABEL", "ADJUDICATOR"],
      humanLabelersAllowed: false,
      adjudication: "The Qwen ADJUDICATOR sees only this item and sealed A/B solve and raw-label receipts, never DeepSeek output.",
      adjudicationQueueTriggers: ["ANY_FIELD_DISAGREEMENT", "ANY_RATER_UNCERTAIN", "ANY_RATER_P0", "ANY_RATER_P1"],
      maximumFinalAdjudicationsPerItem: 1,
      retryAllowedOnlyFor: ["TRANSIENT_NETWORK_FAILURE", "SCHEMA_FAILURE"],
      ambiguousLiteralRule: "Any raw FALSE_ACCEPT_CORRECT_RESPONSE forces adjudication; final output must be SCHEMA_GAP plus UNRESOLVED_REFERENCE in v2.",
      unresolvedRule: "SCHEMA_GAP or adjudicator undecided is UNRESOLVED_REFERENCE; no imputation; unresolved and invalid combined maximum is 3 of 60.",
      noSilentRelabeling: true,
      noImputation: true,
      a11Meaning: "INDEPENDENT_RECOMPUTATION_NOT_HUMAN_GOLD",
      a18Meaning: "METHOD_AND_CLAIM_BOUNDARY_REVIEW_NOT_HUMAN_GOLD",
    },
    analysis: {
      estimands: ["SURFACE_SENSITIVITY", "FAMILY_RECALL", "EXACT_CODE_AND_FAMILY_RECALL", "SPECIFICITY", "FALSE_POSITIVE_RATE", "P0_FALSE_NEGATIVE_COUNT", "P1_RECALL", "P2_MISSED_OR_UNRESOLVED_RATE"],
      metricStatusVocabulary: ["MET", "NOT_MET", "UNDERPOWERED"],
      surfaceMetrics: ["SENSITIVITY", "SPECIFICITY", "FPR", "TP", "FP", "FN", "TN"],
      findingMetrics: ["FAMILY_RECALL", "ACCEPTED_CODE_AND_FAMILY_EXACT_RECALL", "FAMILY_PRECISION", "EXACT_PRECISION", "FALSE_FINDINGS_PER_100_ITEMS"],
      severityMetrics: ["P0_FALSE_NEGATIVES", "P1_RECALL", "P2_MISSED_OR_UNRESOLVED_RATE"],
      panelAgreementMetrics: ["RAW_AGREEMENT", "COHENS_KAPPA", "GWET_AC1", "FAMILY_JACCARD", "CODE_JACCARD", "SEVERITY_AGREEMENT", "ADJUDICATION_RATE"],
      denominatorPolicy: {
        surfaceSensitivity: "reference-positive resolved items; missing and unresolved enter worst-case decision bound",
        surfaceSpecificityAndFpr: "reference-negative resolved items; missing and unresolved enter worst-case decision bound",
        findingRecall: "unique reference keys (item,family,code), excluding statuses and reserved ambiguous literal",
        findingPrecision: "unique machine keys (item,family,code), excluding statuses and reserved ambiguous literal; descriptive only",
        falseFindingsPer100: "unmatched metric-eligible machine findings / all 60 registered items * 100; descriptive only",
        p0FalseNegatives: "metric-eligible P0 reference opportunities",
        p1Recall: "metric-eligible P1 reference opportunities",
        p2MissedOrUnresolved: "metric-eligible P2 reference opportunities, with unresolved counted adverse",
        rawAgreement: "all 60 paired A/B raw item labels",
        adjudicationRate: "items sent to adjudication / all 60 items",
        degenerateNoPositiveReference: "REPORT_NULL_POINT_AND_UNDERPOWERED",
        degenerateNoNegativeReference: "REPORT_NULL_POINT_AND_UNDERPOWERED",
        degenerateAgreementSingleCategory: "REPORT_RAW_AND_AC1_WITH_KAPPA_NULL",
        zeroUnionJaccard: "REPORT_1_ONLY_WHEN_BOTH_SETS_EMPTY_ELSE_STANDARD_INTERSECTION_OVER_UNION",
      },
      matching: {
        cardinality: "ONE_TO_ONE",
        order: ["EXACT_CODE_AND_FAMILY", "FAMILY_ONLY"],
        tieBreak: "FROZEN_TAXONOMY_CODE_SORT_ORDER",
        maximumMatchesPerMachineFinding: 1,
        maximumMatchesPerReferenceFinding: 1,
        metricFindingKey: "UNIQUE(itemId,family,code)",
        statusCodesExcluded: true,
        ambiguousLiteralExcluded: true,
      },
      confidenceIntervals: {
        itemBinaryDecision: "ONE_SIDED_95_PERCENT_WILSON",
        itemBinaryReport: "TWO_SIDED_95_PERCENT_WILSON",
        findingMetrics: "ITEM_CLUSTER_BOOTSTRAP_10000_REPLICATES",
        bootstrapSeed: "DERIVED_FROM_REGISTRATION_HASH",
        bootstrapReplicates: 10000,
        bootstrapUnit: "ITEM_HOMOLOGY_CLUSTER",
        bootstrapPrng: "Counter-based SHA-256 over registrationHash|metric|replicate|draw|rejection; first 64-bit big-endian integer below 2^64-(2^64 mod bound), then integer modulo bound",
        bootstrapGoldenVectors: BOOTSTRAP_GOLDEN_VECTORS.map((vector) => ({ ...vector })),
        decisionCombination: "MOST_CONSERVATIVE_OF_WILSON_CLUSTER_BOOTSTRAP_WORST_CASE_MISSING",
        minimumMetricCombination: "min(Wilson LCB, bootstrap 5th percentile, worst-case-missing LCB)",
        maximumErrorMetricCombination: "max(Wilson UCB, bootstrap 95th percentile, worst-case-missing UCB)",
        inventoryWeighted: "DESCRIPTIVE_ONLY_WITH_KISH_EFFECTIVE_N",
        zOneSided95: 1.6448536269514722,
        zTwoSided95: 1.959963984540054,
      },
      thresholds: {
        surfaceSensitivityOneSidedWilsonLcb95AtLeast: 0.9,
        familyRecallConservativeDecisionLcb95AtLeast: 0.85,
        exactCodeAndFamilyRecallConservativeDecisionLcb95AtLeast: 0.85,
        specificityOneSidedWilsonLcb95AtLeast: 0.95,
        equivalentFalsePositiveRateOneSidedWilsonUcb95AtMost: 0.05,
        p0ObservedFalseNegativesExactly: 0,
        p1RecallConservativeDecisionLcb95AtLeast: 0.9,
        p2MissedOrUnresolvedConservativeDecisionUcb95AtMost: 0.1,
        minimumResolvedPositiveClusters: 25,
        minimumResolvedNegativeClusters: 52,
        maximumUnresolvedAndInvalidCount: 3,
        maximumUnresolvedAndInvalidRate: 0.05,
        insufficientDenominatorStatus: "UNDERPOWERED",
        pointEstimateSubstitutionAllowed: false,
        descriptiveOnly: ["FAMILY_PRECISION", "EXACT_CODE_PRECISION", "FALSE_FINDINGS_PER_100"],
      },
      missingData: {
        maximumUnresolvedAndInvalidCount: 3,
        itemMetricRule: "Enumerate all 2^u adversarial reference-positive/reference-negative assignments for u<=3 using observed machine surface predictions; choose the minimum LCB for minimum metrics and maximum UCB for error metrics.",
        findingMetricRule: "Use the finite 16-code operational defect universe after excluding statuses and FALSE_ACCEPT_CORRECT_RESPONSE; deduplicate by item+family+code; free text and repeated findings add no opportunities; choose the least favorable bound.",
        operationalMetricCodeCount: 16,
        operationalMetricCodes: Object.keys(TAXONOMY).filter((code) => !STATUS_CODES.includes(code) && code !== AMBIGUOUS_LITERAL_CODE),
        perMissingItemMaximumUnmatchedOpportunities: { FAMILY_RECALL: 16, EXACT_RECALL: 16, P1_RECALL: 7, P2_MISSED_OR_UNRESOLVED: 4 },
        maximumAtThreeMissingItems: { FAMILY_RECALL: 48, EXACT_RECALL: 48, P1_RECALL: 21, P2_MISSED_OR_UNRESOLVED: 12 },
        counterfactualLedgerSeparateFromObservedCounts: true,
        p0MissingRule: "P0 decision is observed false negatives only; missing opportunities are not fabricated as observed P0 false negatives.",
        interpretation: "CONSERVATIVE_PILOT_BOUND_NOT_PREVALENCE_ESTIMATE",
        imputationAllowed: false,
      },
      decisionPriority: [
        "INVALID_FOR_GENERALIZATION",
        "EXECUTION_INTEGRITY_FAILED",
        "POLICY_REVISION_REQUIRED_MACHINE_REFERENCE",
        "LIMITED_GENERALIZATION_EVIDENCE",
        "INCONCLUSIVE_MACHINE_REFERENCE",
      ],
      decisionStatuses: [...DECISION_STATUSES],
      ca60DecisionCeiling: "INCONCLUSIVE_MACHINE_REFERENCE",
      prohibitedCa60Output: "LIMITED_GENERALIZATION_EVIDENCE",
      decisionRules: {
        INVALID_FOR_GENERALIZATION: ["THRESHOLD_FROZEN_AFTER_LABEL_OR_RESULT", "LABEL_LEAKAGE", "RESULT_DEPENDENT_REPLACEMENT_PROMPT_TUNING_OR_REROLL", "FRAME_MANIFEST_SCHEMA_MODEL_ENDPOINT_OR_RUNNER_HASH_DRIFT", "UNAUTHORIZED_PROVIDER_CALL", "POST_HOC_TAXONOMY_OR_THRESHOLD_CHANGE"],
        EXECUTION_INTEGRITY_FAILED: ["RECEIPT_CHAIN_UNVERIFIABLE", "REQUESTED_OBSERVED_MODEL_MISMATCH", "PROVIDER_ORIGIN_DRIFT", "TOKEN_ATTEMPT_OR_USD_CAP_EXCEEDED", "COMPLETE_ITEM_RECEIPTS_BELOW_57", "UNRESOLVED_OR_INVALID_ABOVE_3", "PROVIDER_OR_NETWORK_FAILURE_PREVENTS_FROZEN_COMPLETION"],
        POLICY_REVISION_REQUIRED_MACHINE_REFERENCE: ["ANY_OBSERVED_P0_FALSE_NEGATIVE", "MINIMUM_ENDPOINT_ONE_SIDED_95_UCB_BELOW_THRESHOLD", "MAXIMUM_ERROR_ENDPOINT_ONE_SIDED_95_LCB_ABOVE_THRESHOLD"],
        INCONCLUSIVE_MACHINE_REFERENCE: ["CONFIDENCE_INTERVAL_CROSSES_THRESHOLD", "DENOMINATOR_UNDERPOWERED", "CA60_STRUCTURAL_FEASIBILITY_GATE_FAILED"],
      },
      authorizationLifecycleStatus: "AUTHORIZATION_BLOCKED_SEPARATE_FROM_FINAL_CONCLUSION",
    },
    runtimeAccommodation: {
      maxAnswerChoices: 0,
      accommodationBasedOptionTruncationAllowed: false,
      runtimeConfigHashMustBindTheseValues: true,
    },
    providerControls: {
      firstProviderExecutionAllowed: false,
      requiredAuthorizationSchema: "ProviderAuthorizationV1",
      allowedOrigins: ["FROZEN_RUNTIME_VISIBLE_CA_FRAME"],
      egress: {
        jurisdiction: "CALIFORNIA_ELIGIBLE_ONLY",
        personalDataAllowed: false,
        secretsAllowed: false,
        copyrightedLongFormSourceAllowed: false,
        exactPayloadHashRequired: true,
      },
      qwenEnvelope: {
        provider: "ALIBABA_CLOUD_MODEL_STUDIO",
        region: "cn-beijing",
        method: "POST",
        endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
        requestedModel: "qwen3.8-max",
        observedModelRequired: "qwen3.8-max",
        requestedSeed: null,
        requestTemplate: { stream: false, n: 1, enable_thinking: true, temperature: 0, top_p: "OMITTED", response_format: { type: "json_object" }, max_tokens: 8192, tools: [], search: "DISABLED" },
        systemPromptMustContainJson: true,
        localSchemaValidationAuthoritative: true,
        silentFallbackAllowed: false,
        endpointMigrationRequiresNewDesignVersion: true,
        baseSuccessfulCallsPerItem: 4,
        baseSuccessfulCallsTotal: 240,
        adjudicatorSuccessfulCallsMaximum: 60,
        successfulCallsMinimum: 240,
        successfulCallsMaximum: 300,
        maximumAttemptsPerRole: 2,
        attemptCap: 610,
        tokenCap: 4000000,
        usdCap: 25,
        concurrencyCap: 4,
      },
      deepSeekEnvelope: {
        provider: "DEEPSEEK_DIRECT",
        region: "PROVIDER_MANAGED",
        method: "POST",
        endpoint: "https://api.deepseek.com/chat/completions",
        requestedModel: "deepseek-v4-pro",
        observedModelRequired: "deepseek-v4-pro",
        requestedOrigin: "https://api.deepseek.com/chat/completions",
        observedOriginRequired: "https://api.deepseek.com/chat/completions",
        fallbackAllowed: false,
        requestedSeed: null,
        requestTemplate: { stream: false, n: 1, thinking: "ENABLED", reasoning_effort: "high", temperature: 0, top_p: "OMITTED", max_tokens: 8192, response_format: { type: "json_object" }, tools: [] },
        unsupportedParameterRequiresNewDesignVersion: true,
        priceNotHardcoded: true,
        authorizationPriceSnapshotRequired: { hash: true, date: true, currency: true, rates: true, mustBeCurrent: true },
        critiqueRevisionSuccessfulCallsPerItem: 2,
        critiqueRevisionSuccessfulCallsTotal: 120,
        c0PrimePreregisteredRandomItems: 12,
        c0PrimeRolesPerItem: 5,
        c0PrimeMandatoryTriggersIncluded: true,
        successfulCallsMinimum: 180,
        successfulCallsMaximum: 420,
        maximumAttemptsPerRole: 2,
        attemptCap: 850,
        tokenCap: 6000000,
        usdCap: 25,
        concurrencyCap: 4,
        c0PrimeMandatoryTriggerPredicates: [
          "POSSIBLE_P0_OR_P1_MATH_OR_ANSWER_KEY",
          "SOURCE_RIGHTS_OR_RECONSTRUCTION_RISK",
          "AGE_GRADE_CURRICULUM_LANGUAGE_OR_REGION_RISK",
          "ANSWER_CRITICAL_VISUAL_OR_EVIDENCE",
          "DETERMINISTIC_VS_B_PRIME_CONFLICT",
          "CRITIQUE_VS_REVISION_CONFLICT",
          "INVALID_TAXONOMY_SCHEMA_OR_ROLE",
          "OUT_OF_SCOPE_METADATA_OR_EVIDENCE",
          "DECLARED_OUT_OF_DISTRIBUTION",
        ],
        c0PrimeMandatoryPredicateInputFields: C0_MANDATORY_PREDICATES.map(([inputField]) => inputField),
        c0PrimeMandatoryPredicateEvaluationTiming: "AFTER_B_PRIME_REVISION_AND_BEFORE_ANY_C0_CALL_WITH_ZERO_QWEN_LABEL_INPUTS",
        c0PrimeUnknownPredicateDisposition: "TRIGGER",
        c0PrimeMalformedOrMissingPredicateDisposition: "TRIGGER",
        c0PrimeSelectionSetFormula: "UNION(MANDATORY_TRIGGER_SET,RANDOM_AUDIT_12_SET)",
        c0PrimeSelectionCardinality: { minimum: 12, maximum: 60 },
        c0PrimeSuccessfulCallFormula: "120+5*uniqueC0ItemCount",
        c0PrimeRandomSelectionReason: "REGISTERED_RANDOM_AUDIT",
        c0PrimeBudgetSelectiveSkipAllowed: false,
        c0PrimeInsufficientCapDisposition: "FAIL_CLOSED_BEFORE_REQUEST",
        c0PrimeTriggerInputs: "LOCAL_ITEM_EVIDENCE_POLICY_AND_B_PRIME_OUTPUTS_ONLY_NEVER_QWEN_LABELS",
        c0PrimeTriggerEngineQwenInputCount: 0,
        c0PrimeRoleOrder: ["C0_PRIME_ROLE_1", "C0_PRIME_ROLE_2", "C0_PRIME_ROLE_3", "C0_PRIME_ROLE_4", "C0_PRIME_ROLE_5"],
        c0PrimeRolePromptsSchemasAndHashesRequired: true,
        c0PrimeRoleOutputReduction: "FIVE_ROLE_CONSERVATIVE_UNION_WITH_MAX_SEVERITY_AND_UNRESOLVED_ON_ANY_INVALID_OR_CONFLICT",
        c0PrimeReducerArrivalOrderInvariant: true,
        c0PrimeReducerCodeNormalization: "FROZEN_ENUM_EXACT_CASE_NO_SYNONYMS",
        c0PrimeReducerDuplicateRule: "UNIQUE_ITEM_FAMILY_CODE; SAME_ROLE_DUPLICATE_IS_INVALID; CROSS_ROLE_DUPLICATE_INCREMENTS_SUPPORT_COUNT_ONLY",
        c0PrimeReducerUnknownOrConflictRule: "UNRESOLVED_NO_METRIC_CREDIT",
        c0PrimeSixthCallAllowed: false,
        c0PrimeRandomMandatoryOverlapCallsPerItem: 5,
        c0PrimeSameModelCorrelated: true,
        c0PrimeHumanClaimAllowed: false,
        c0PrimeRandomAudit: {
          targetItems: 12,
          allocation: "capacity-constrained Hamilton over sample stratum counts with base one per nonempty cell",
          basePerNonemptyCell: 1,
          algorithmVersion: "c0-audit-v1",
          formula: "SHA256(designHash|sampleHash|c0-audit-v1|stratum|clusterId|itemHash)",
          noReroll: true,
          frozenBeforeQwenLabels: true,
        },
      },
      combinedEnvelope: {
        envelopesSeparateAndNonTransferable: true,
        attemptCap: 1460,
        tokenCap: 10000000,
        usdCap: 50,
        worstCaseBufferGate: 0.2,
        warningAtFraction: 0.8,
        failBeforeFraction: 1,
        hardStopOnCap: true,
      },
      authorizationRequiredBindings: ["registrationRootHash", "frameHash", "sampleManifestHash", "promptHash", "schemaHash", "runnerCommit", "runnerHash", "adapterHash", "provider", "model", "endpoint", "dataRegion", "egressAllowlist", "privacyScreenHash", "rightsScreenHash", "inputTokenCap", "outputTokenCap", "totalTokenCap", "successfulCallCap", "attemptCap", "usdCap", "currency", "priceSnapshotHash", "issuedAt", "expiresAt", "authorizer", "nonAuthorizations"],
    },
    executionLifecycle: {
      firstProviderCallProhibitedByThisDesignArtifact: true,
      preFirstProviderChange: "NEW_VERSION_WITH_SUPERSEDES",
      postFirstProviderMaterialChange: "INVALID_FOR_GENERALIZATION_PRESERVE_RECEIPTS_NEW_REGISTRATION_RESTART_FIRST_ITEM",
      postFirstProviderMaterialChangeFields: ["prompt", "schema", "threshold", "frame", "manifest", "model", "endpoint", "runner"],
      registeredCanary: "FIRST_SORTED_MANIFEST_ITEM_INCLUDED_IN_60",
      canaryMayTune: false,
      receiptPreservationRequired: true,
      receiptStorageContract: {
        appendOnly: true,
        atomicWrite: true,
        fileMode: "0600",
        completedItemCommitMarker: true,
        resumeOnlyMissingRoles: true,
        cacheHitIsProviderExecution: false,
        failedAttemptsConsumeAttemptCap: true,
        providerInvoiceIsFinalCostAuthority: true,
      },
    },
    interfaces: {
      schemaTitles: ["NaturalCaPilotDesignRegistrationV2", "SamplingFrameRowV1", "SampleManifestV1", "MachineReferenceLabelV1", "ProviderAuthorizationV1", "ProviderAttemptReceiptV1", "ItemEvaluationResultV1", "FinalEvaluationReceiptV1", "IndependentReviewReceiptV1"],
      cliCommands: ["register", "freeze-frame", "audit-clusters", "freeze-sample", "label-qwen", "seal-reference-labels", "dry-run", "authorize-check", "execute-deepseek --canary 1", "execute-deepseek --resume", "score", "verify", "export-aggregate-report"],
      allCommandsVerifyUpstreamHashesAndFailClosed: true,
    },
    artifactStorage: {
      trackedDesignSchemaRoot: "coordination/research/mais-natural-ca60-v1/",
      trackedRunnerTestRoot: "coordination/content-qa/mais-natural-ca60-v1/",
      protectedRoot: ".local/mais-natural-ca60-v1/",
      protectedSamplingFrame: "sampling-frame.jsonl",
      publicFrameLedger: "frame-count-hash-ledger.json",
      publicFrameContentAllowed: false,
      canonicalization: "RFC_8785_JCS",
      hash: "SHA-256",
      registrationRootTuple: "SORTED_ITEM_ID_PLUS_ITEM_HASH_PLUS_CLUSTER_ID",
    },
    artifactKinds: {
      thisArtifact: "DESIGN_REGISTRATION",
      futureDistinctArtifacts: ["SAMPLING_FRAME", "SAMPLE_MANIFEST", "PROVIDER_AUTHORIZATION", "PROVIDER_EXECUTION_RECEIPTS", "FINAL_EVALUATION", "INDEPENDENT_REVIEW"],
    },
    freezeChain: ["DESIGN_REGISTRATION_V2", "FRAME_REGISTRATION", "SAMPLE_REGISTRATION", "QWEN_AUTHORIZATION", "REFERENCE_LABEL_SEAL", "DEEPSEEK_AUTHORIZATION", "EXECUTION_REGISTRATION"],
  };
}

export function validateDesignStructure(registration) {
  const errors = [];
  if (registration.schemaVersion !== SCHEMA_VERSION) errors.push("schemaVersion mismatch");
  if (registration.designId !== DESIGN_ID) errors.push("designId mismatch");
  if (registration.frozenAt !== FREEZE_TIMESTAMP) errors.push("freeze timestamp mismatch");
  if (registration.baselineCommitSha !== BASELINE_SHA) errors.push("baseline SHA mismatch");
  if (registration.scope?.targetClusterCount !== 60) errors.push("target cluster count must be 60");
  if (registration.scope?.claimCeiling !== "INCONCLUSIVE_MACHINE_REFERENCE") errors.push("claim ceiling mismatch");
  if (registration.supersedes?.registrationHash !== PREDECESSOR_REGISTRATION_HASH || registration.supersedes?.designId !== "MAIS-NATURAL-CA60-V1") errors.push("predecessor supersession binding mismatch");
  if (registration.providerControls?.firstProviderExecutionAllowed !== false) errors.push("provider execution must remain disabled");
  if (registration.stratification?.cells?.length !== 9) errors.push("exactly nine strata required");
  if (canonicalJson(registration.stratification?.responseForms) !== canonicalJson(RESPONSE_FORMS) || canonicalJson(registration.stratification?.difficulties) !== canonicalJson(DIFFICULTIES)) errors.push("runtime stratum values mismatch");
  if (registration.runtimeAccommodation?.maxAnswerChoices !== 0 || registration.runtimeAccommodation?.accommodationBasedOptionTruncationAllowed !== false) errors.push("runtime accommodation mismatch");
  if (registration.providerControls?.qwenEnvelope?.attemptCap !== 610 || registration.providerControls?.deepSeekEnvelope?.attemptCap !== 850 || registration.providerControls?.combinedEnvelope?.attemptCap !== 1460) errors.push("provider attempt envelope mismatch");
  if (registration.providerControls?.deepSeekEnvelope?.c0PrimeTriggerEngineQwenInputCount !== 0) errors.push("C0 trigger engine must receive exactly zero Qwen inputs");
  for (const vector of registration.analysis?.confidenceIntervals?.bootstrapGoldenVectors ?? []) {
    if (bootstrapBoundedIndex(vector) !== vector.expectedIndex) errors.push("bootstrap PRNG golden vector mismatch");
  }
  if (registration.freezeChain?.[0] !== "DESIGN_REGISTRATION_V2") errors.push("design registration v2 must lead freeze chain");
  const decisionText = (registration.analysis?.decisionStatuses ?? []).join(" ");
  for (const word of FORBIDDEN_OVERALL_DECISION_WORDS) {
    if (new RegExp(`(^|_)${word}(_|$)`, "u").test(decisionText)) errors.push(`forbidden decision word ${word}`);
  }
  return errors;
}
