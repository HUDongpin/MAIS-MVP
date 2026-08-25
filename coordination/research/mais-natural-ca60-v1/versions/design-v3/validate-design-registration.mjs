#!/usr/bin/env node

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  calculateArtifactHash,
  canonicalJson,
  DEEPSEEK_ROLE_CONTRACTS,
  DESIGN_ID,
  DESIGN_SCHEMA_VERSION,
  FINDING_WORST_CASE_METHOD,
  INTEGRITY_LIMIT_EXCEEDED_WORST_CASE_METHOD,
  PREDECESSOR_REGISTRATION_HASH,
  QWEN_ROLE_CONTRACTS,
  SURFACE_WORST_CASE_METHOD,
  UNIFIED_NONRESOLVED_UNIVERSE_FORMULA,
  providerRequestTemplateHash,
  sha256Hex,
} from "./design-contract.mjs";
import {
  C0_AUDIT_ALGORITHM_DESCRIPTOR,
  C0_AUDIT_ALGORITHM_HASH,
  C0_AUDIT_SELECTION_DIGEST_CONTRACT,
  C0_AUDIT_SELECTION_GOLDEN_VECTOR,
  RUNTIME_SOURCE_ENUMERATION_EVIDENCE_CONTRACT,
  RUNTIME_SOURCE_ENUMERATION_EVIDENCE_CONTRACT_HASH,
  SAMPLE_ALGORITHM_DESCRIPTOR,
  SAMPLE_ALGORITHM_HASH,
  SAMPLE_SELECTION_DIGEST_CONTRACT,
  SAMPLE_SELECTION_GOLDEN_VECTOR,
} from "./sample-contract.mjs";

const packageDirectory = path.dirname(fileURLToPath(import.meta.url));
const BASELINE_SHA = "b6c7c347a49a813e454e707dd3c16399dcf29909";
const FREEZE_TIMESTAMP = "2026-08-24T19:55:00.000Z";
const PRIOR_NATURAL_DESIGN_SHA256 = "85bc51cec9e160c1a23e94e671c85d2de4b52e8b2b8e9afcbcf04b7b19528867";
const PRESERVATION_ARCHIVE_SHA256 = "2656f336387ed85c495a6b08b96fdf1e34f1942f0e1b3f83421fdab7f7dd0c71";
// Replaced once after the complete V3 registration is assembled; any later
// mutation, including a recomputed self-hash, must fail this immutable anchor.
const FROZEN_REGISTRATION_HASH = "08e89a4d0c6736b48c1dde0048d8f620c35fc486e1d1feaf272e30a1aae4973d";
const EXPECTED_SCHEMA_TITLES = [
  "C0ExecutionSetV1",
  "C0TriggerInputV1",
  "ClaimBoundaryReviewReceiptV1",
  "CompletedItemCommitMarkerV1",
  "CounterfactualLedgerV1",
  "DeepSeekRoleOutputV1",
  "ExecutionDeviationEvidenceV1",
  "ExecutionRegistrationV1",
  "FinalEvaluationReceiptV1",
  "FrameRegistrationV1",
  "IndependentReviewReceiptV1",
  "ItemEvaluationResultV1",
  "ItemReferenceLabelSealV1",
  "MachineReferenceLabelV1",
  "NaturalCaPilotDesignRegistrationV3",
  "ProviderAttemptReceiptV1",
  "ProviderAuthorizationV1",
  "ReferenceLabelSealV1",
  "RuntimeExtractionSnapshotV1",
  "SampleManifestV1",
  "SampleManifestV2",
  "SamplingFrameRowV1",
  "SamplingFrameRowV2",
].sort();
const EXPECTED_DECISIONS = [
  "INVALID_FOR_GENERALIZATION",
  "EXECUTION_INTEGRITY_FAILED",
  "POLICY_REVISION_REQUIRED_MACHINE_REFERENCE",
  "INCONCLUSIVE_MACHINE_REFERENCE",
];
const EXPECTED_EXCLUSIONS = [
  "NON_CA_TRACK",
  "RUNTIME_NOT_VISIBLE",
  "SYNTHETIC_TEST_CANDIDATE_ONLY",
  "RESTRICTED_EGRESS_CONTENT",
  "UNSTABLE_SERIALIZATION",
];
const EXPECTED_DEFECT_CODES = [
  "WRONG_CANONICAL_ANSWER",
  "UNSOLVABLE_OR_INTERNALLY_INCONSISTENT",
  "FALSE_ACCEPT_CORRECT_RESPONSE",
  "FALSE_ACCEPT_NEAR_MISS",
  "FALSE_REJECT_CORRECT_RESPONSE",
  "ORACLE_OR_PROMPT_LEAKAGE",
  "EQUIVALENT_ANSWER_NOT_ACCEPTED",
  "MULTIPLE_CORRECT_OPTIONS",
  "MISSING_OR_MISMATCHED_OPTIONS",
  "EXPLANATION_ANSWER_MISMATCH",
  "EVIDENCE_MISMATCH",
  "LANGUAGE_SEMANTIC_MISMATCH",
  "CURRICULUM_OR_METADATA_MISMATCH",
  "MINOR_WORDING_OR_FORMAT",
  "MINOR_EXPLANATION_WEAKNESS",
  "REDUNDANT_OR_NEAR_DUPLICATE",
  "MINOR_METADATA_MISMATCH",
];
const EXPECTED_HASH_DAG_NODES = [
  "STATIC_DESIGN_CONTRACT_LITERALS",
  "JSON_SCHEMA_BYTES_WITH_DERIVED_HASH_FIELDS_STRUCTURAL_ONLY",
  "CANONICAL_SCHEMA_HASHES_AND_SCHEMA_SET_HASH",
  "FROZEN_CONTRACT_SECTION_HASHES",
  "DESIGN_REGISTRATION_HASH",
  "STATISTICAL_POWER_ARTIFACT",
  "ACTIVE_DESIGN_POINTER_MUTABLE_NON_REGISTRATION",
];
const EXPECTED_HASH_DAG_EDGES = [
  "STATIC_DESIGN_CONTRACT_LITERALS->JSON_SCHEMA_BYTES_WITH_DERIVED_HASH_FIELDS_STRUCTURAL_ONLY",
  "JSON_SCHEMA_BYTES_WITH_DERIVED_HASH_FIELDS_STRUCTURAL_ONLY->CANONICAL_SCHEMA_HASHES_AND_SCHEMA_SET_HASH",
  "STATIC_DESIGN_CONTRACT_LITERALS->FROZEN_CONTRACT_SECTION_HASHES",
  "CANONICAL_SCHEMA_HASHES_AND_SCHEMA_SET_HASH->FROZEN_CONTRACT_SECTION_HASHES",
  "STATIC_DESIGN_CONTRACT_LITERALS->DESIGN_REGISTRATION_HASH",
  "FROZEN_CONTRACT_SECTION_HASHES->DESIGN_REGISTRATION_HASH",
  "DESIGN_REGISTRATION_HASH->STATISTICAL_POWER_ARTIFACT",
  "DESIGN_REGISTRATION_HASH->ACTIVE_DESIGN_POINTER_MUTABLE_NON_REGISTRATION",
];
const EPSILON = 1e-12;

function nearlyEqual(left, right) {
  return Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) <= EPSILON;
}

function same(left, right) {
  try {
    return canonicalJson(left) === canonicalJson(right);
  } catch {
    return false;
  }
}

function frozenRoleContractProjection(contracts) {
  return Object.fromEntries(Object.entries(contracts).map(([role, contract]) => [role, {
    inputFieldNames: [...contract.inputFieldNames],
    promptLiteral: contract.promptLiteral,
    promptHash: contract.promptHash,
    schemaLiteral: contract.schemaLiteral,
    schemaHash: contract.schemaHash,
  }]));
}

function expectedFrozenRoleContracts() {
  return {
    qwen: frozenRoleContractProjection(QWEN_ROLE_CONTRACTS),
    deepSeek: frozenRoleContractProjection(DEEPSEEK_ROLE_CONTRACTS),
    qwenRequestTemplateHash: providerRequestTemplateHash("ALIBABA_CLOUD_MODEL_STUDIO"),
    deepSeekRequestTemplateHash: providerRequestTemplateHash("DEEPSEEK_DIRECT"),
  };
}

function check(errors, condition, message) {
  if (!condition) errors.push(message);
}

function isStrictRfc3339Instant(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)) return false;
  const epoch = Date.parse(value);
  return Number.isFinite(epoch) && new Date(epoch).toISOString() === value;
}

function hashDependencyDagIsAcyclic(dag) {
  if (!same(dag?.nodes, EXPECTED_HASH_DAG_NODES) || !same(dag?.edges, EXPECTED_HASH_DAG_EDGES)) return false;
  const indegree = new Map(dag.nodes.map((node) => [node, 0]));
  const adjacency = new Map(dag.nodes.map((node) => [node, []]));
  for (const edge of dag.edges) {
    const parts = edge.split("->");
    if (parts.length !== 2 || !indegree.has(parts[0]) || !indegree.has(parts[1])) return false;
    adjacency.get(parts[0]).push(parts[1]);
    indegree.set(parts[1], indegree.get(parts[1]) + 1);
  }
  const queue = dag.nodes.filter((node) => indegree.get(node) === 0);
  let visited = 0;
  while (queue.length > 0) {
    const node = queue.shift();
    visited += 1;
    for (const next of adjacency.get(node)) {
      indegree.set(next, indegree.get(next) - 1);
      if (indegree.get(next) === 0) queue.push(next);
    }
  }
  return visited === dag.nodes.length;
}

export function calculateRegistrationHash(registration) {
  return calculateArtifactHash(registration, "registrationHash");
}

export function calculateFrozenContractHashes(registration) {
  return {
    taxonomyHash: calculateArtifactHash({ taxonomy: registration.taxonomy }, "__none__"),
    labelingAndAdjudicationHash: calculateArtifactHash({ machineReferenceWorkflow: registration.machineReferenceWorkflow, labeling: registration.labeling }, "__none__"),
    analysisThresholdAndDecisionHash: calculateArtifactHash({ analysis: registration.analysis }, "__none__"),
    providerControlsHash: calculateArtifactHash({ providerControls: registration.providerControls }, "__none__"),
    samplingAndClusteringHash: calculateArtifactHash({
      runtimePopulation: registration.runtimePopulation,
      eligibility: registration.eligibility,
      stratification: registration.stratification,
      homologyClustering: registration.homologyClustering,
      deterministicSelection: registration.deterministicSelection,
    }, "__none__"),
    interfacesAndIntegrityHash: calculateArtifactHash({
      interfaces: registration.interfaces,
      crossArtifactIntegrity: registration.crossArtifactIntegrity,
      independentReview: registration.independentReview,
      publicReport: registration.publicReport,
      executionLifecycle: registration.executionLifecycle,
      artifactStorage: registration.artifactStorage,
      artifactKinds: registration.artifactKinds,
      freezeChain: registration.freezeChain,
      hashDependencyDag: registration.hashDependencyDag,
    }, "__none__"),
  };
}

export function wilsonInterval(n, successes, z) {
  if (!Number.isInteger(n) || n <= 0 || !Number.isInteger(successes) || successes < 0 || successes > n || !Number.isFinite(z) || z <= 0) {
    throw new RangeError("invalid Wilson interval inputs");
  }
  const p = successes / n;
  const zSquared = z * z;
  const denominator = 1 + zSquared / n;
  const center = (p + zSquared / (2 * n)) / denominator;
  const halfWidth = z * Math.sqrt((p * (1 - p)) / n + zSquared / (4 * n * n)) / denominator;
  return { lower: center - halfWidth, upper: center + halfWidth, halfWidth };
}

export function oneSidedAllSuccessLower(n, z) {
  if (!Number.isInteger(n) || n <= 0 || !Number.isFinite(z) || z <= 0) throw new RangeError("invalid all-success Wilson inputs");
  return n / (n + z * z);
}

export function minimumAllSuccessN(target, z) {
  if (!(target > 0 && target < 1)) throw new RangeError("target must be between zero and one");
  let n = 1;
  while (oneSidedAllSuccessLower(n, z) < target) n += 1;
  return n;
}

export function zeroMissRequiredN(targetMissRate, tailProbability = 0.05) {
  if (!(targetMissRate > 0 && targetMissRate < 1) || !(tailProbability > 0 && tailProbability < 1)) throw new RangeError("invalid zero-miss inputs");
  return Math.ceil(Math.log(tailProbability) / Math.log(1 - targetMissRate));
}

export function buildStatisticalPower(registrationHash) {
  const zOne = 1.6448536269514722;
  const zTwo = 1.959963984540054;
  const positiveN = minimumAllSuccessN(0.9, zOne);
  const negativeN = minimumAllSuccessN(0.95, zOne);
  const interval = wilsonInterval(60, 30, zTwo);
  const zeroMissOpportunity = [0.05, 0.02, 0.01].map((targetMissRate) => {
    const requiredN = zeroMissRequiredN(targetMissRate);
    return {
      targetMissRate,
      zeroMissTailProbabilityAtRequiredN: (1 - targetMissRate) ** requiredN,
      requiredN,
      formula: "ceil(log(0.05)/log(1-targetMissRate))",
    };
  });
  const artifact = {
    schemaVersion: "NaturalCaStatisticalPowerV1",
    designId: DESIGN_ID,
    designRegistrationHash: registrationHash,
    calculationPolicy: {
      calculatedBy: "validate-design-registration.mjs",
      oneSidedConfidence: 0.95,
      oneSidedWilsonZ: zOne,
      twoSidedConfidence: 0.95,
      twoSidedWilsonZ: zTwo,
      rounding: "Stored IEEE-754 calculation outputs are validated within 1e-12; integer minima are exact.",
    },
    binaryThresholdOpportunity: {
      sensitivityTargetLowerBound: 0.9,
      minimumAllSuccessPositiveN: positiveN,
      positiveNMinusOneLowerBound: oneSidedAllSuccessLower(positiveN - 1, zOne),
      positiveNLowerBound: oneSidedAllSuccessLower(positiveN, zOne),
      specificityTargetLowerBound: 0.95,
      minimumAllSuccessNegativeN: negativeN,
      negativeNMinusOneLowerBound: oneSidedAllSuccessLower(negativeN - 1, zOne),
      negativeNLowerBound: oneSidedAllSuccessLower(negativeN, zOne),
      requiredTotal: positiveN + negativeN,
      availableDistinctClusters: 60,
      structurallyPossibleWithin60: false,
      limitedConclusionAvailable: false,
      derivation: "For x=n, the one-sided Wilson lower bound is n/(n+z^2); 25+52=77>60.",
    },
    ca60WorstCasePrecision: {
      n: 60,
      assumedProportion: 0.5,
      method: "TWO_SIDED_95_PERCENT_WILSON",
      lower: interval.lower,
      upper: interval.upper,
      halfWidth: interval.halfWidth,
    },
    zeroMissOpportunity,
    planningScale: {
      worstCaseNormalApproximationNForFivePercentagePointHalfWidth: (zTwo * zTwo * 0.25) / (0.05 ** 2),
      recommendedIndependentClusters: 400,
      note: "Plan approximately 400 independent homology clusters for worst-case plus or minus 5 percentage-point precision; this is planning guidance, not a CA60 claim.",
    },
    ca60Conclusion: "LIMITED_UNAVAILABLE_INCONCLUSIVE_MACHINE_REFERENCE",
  };
  artifact.powerArtifactHash = calculateArtifactHash(artifact, "powerArtifactHash");
  return artifact;
}

function canonicalSchemaHashCatalog(schemas) {
  return Object.fromEntries(schemas
    .map((schema) => [schema?.title ?? "UNTITLED_SCHEMA", sha256Hex(canonicalJson(schema))])
    .sort(([left], [right]) => left.localeCompare(right)));
}

function validateSchemaContracts(registration, schemas, errors) {
  check(errors, same(schemas.map((schema) => schema.title).sort(), EXPECTED_SCHEMA_TITLES), "schema title set mismatch");
  for (const schema of schemas) {
    const title = schema?.title ?? "UNTITLED_SCHEMA";
    check(errors, schema?.$schema === "https://json-schema.org/draft/2020-12/schema", `${title}: draft mismatch`);
    check(errors, schema?.$id === `https://mais.hk/schemas/research/${title}.schema.json`, `${title}: $id mismatch`);
    check(errors, schema?.type === "object" && schema?.additionalProperties === false, `${title}: root must be a closed object`);
    check(errors, schema?.properties?.schemaVersion?.const === title && schema?.required?.includes("schemaVersion"), `${title}: schemaVersion contract mismatch`);
  }
  const auth = schemas.find((schema) => schema.title === "ProviderAuthorizationV1");
  const attempt = schemas.find((schema) => schema.title === "ProviderAttemptReceiptV1");
  const final = schemas.find((schema) => schema.title === "FinalEvaluationReceiptV1");
  const review = schemas.find((schema) => schema.title === "IndependentReviewReceiptV1");
  check(errors, Array.isArray(auth?.allOf) && auth.allOf.length >= 2, "ProviderAuthorizationV1 provider conditionals missing");
  check(errors, Array.isArray(attempt?.allOf) && attempt.allOf.length >= 2, "ProviderAttemptReceiptV1 status/provider conditionals missing");
  check(errors, final?.required?.includes("unifiedNonresolvedItemCount"), "FinalEvaluationReceiptV1 unified nonresolved field missing");
  check(errors, review?.allOf?.some((entry) => entry?.if?.properties?.reviewStatus?.const === "CONCURRED"), "IndependentReviewReceiptV1 CONCURRED conditional missing");
  const schemaHashes = canonicalSchemaHashCatalog(schemas);
  check(errors, registration?.interfaces?.schemaCanonicalization === "RFC8785_JCS_SHA256", "schema canonicalization contract mismatch");
  check(errors, same(registration?.interfaces?.canonicalSchemaHashes, schemaHashes), "canonical schema hash catalog mismatch");
  check(errors, registration?.interfaces?.schemaSetHash === sha256Hex(canonicalJson(schemaHashes)), "canonical schema set hash mismatch");
}

function validateDesignSemantics(registration, errors) {
  check(errors, registration.schemaVersion === DESIGN_SCHEMA_VERSION && registration.designId === DESIGN_ID && registration.version === 3, "design identity mismatch");
  check(errors, registration.designKind === "IMMUTABLE_PRE_EXECUTION_DESIGN_REGISTRATION", "design kind mismatch");
  check(errors, registration.baselineCommitSha === BASELINE_SHA, "baseline binding mismatch");
  check(errors, isStrictRfc3339Instant(registration.frozenAt) && registration.frozenAt === FREEZE_TIMESTAMP, "freeze timestamp mismatch");
  check(errors, registration.supersedes?.registrationHash === PREDECESSOR_REGISTRATION_HASH && registration.supersedes?.designId === "MAIS-NATURAL-CA60-V2", "V2 predecessor binding mismatch");
  check(errors, registration.provenance?.preservedPriorNaturalDesignSha256 === PRIOR_NATURAL_DESIGN_SHA256, "prior design hash mismatch");
  check(errors, registration.provenance?.preservationArchiveSha256 === PRESERVATION_ARCHIVE_SHA256, "preservation archive hash mismatch");
  check(errors, registration.scope?.framePopulation === "ALL_CA_RUNTIME_VISIBLE_QUESTIONS" && registration.scope?.estimandPopulation === "EGRESS_ELIGIBLE_CA_RUNTIME_VISIBLE_QUESTIONS", "frame/estimand population separation mismatch");
  check(errors, registration.scope?.targetClusterCount === 60 && registration.scope?.claimCeiling === "INCONCLUSIVE_MACHINE_REFERENCE", "CA60 scope or decision ceiling mismatch");
  check(errors, registration.runtimePopulation?.sourceCommit === BASELINE_SHA && registration.runtimePopulation?.curriculumProfile === "US_CA_MATH" && registration.runtimePopulation?.actor === "AUTHENTICATED_STUDENT", "runtime population binding mismatch");
  check(errors, registration.runtimePopulation?.gradeProjectionCount === 13 && registration.runtimePopulation?.maxAnswerChoices === 0 && registration.runtimePopulation?.accommodationOptionTruncation === false, "runtime projection/accommodation mismatch");
  check(errors, same(registration.eligibility?.exclusionCodes, EXPECTED_EXCLUSIONS) && registration.eligibility?.exclusionListClosed === true, "closed exclusion vocabulary mismatch");
  check(errors, registration.eligibility?.missingAnswerOptionsExplanationRemainIncluded === true && registration.eligibility?.unresolvedRuntimeVisibleSerializationFailureBlocksFreeze === true, "inclusion or frame-failure disposition mismatch");
  check(errors, same(registration.eligibility?.allowedResponseForms, ["multiple-choice", "fill-in", "short-answer"]), "response-form vocabulary mismatch");
  check(errors, same(registration.eligibility?.allowedDifficulties, ["Low", "Medium", "High"]), "difficulty vocabulary mismatch");
  check(errors, registration.homologyClustering?.blockers?.frameShareStrictlyGreaterThan === 0.05 && registration.homologyClustering?.blockers?.topicBridgeCountStrictlyGreaterThan === 2, "cluster blockers mismatch");
  check(errors, registration.deterministicSelection?.resultBlind === true && registration.deterministicSelection?.rerollAfterAnyLabelOrResult === "FORBIDDEN" && registration.deterministicSelection?.selectionRootExcludesArtifactTimestamps === true, "selection blindness/timestamp contract mismatch");
  check(errors, same(registration.runtimePopulation?.sourceEnumerationEvidenceContract, RUNTIME_SOURCE_ENUMERATION_EVIDENCE_CONTRACT)
    && registration.runtimePopulation?.sourceEnumerationEvidenceContractHash === RUNTIME_SOURCE_ENUMERATION_EVIDENCE_CONTRACT_HASH, "runtime source-enumeration evidence contract mismatch");
  check(errors, same(registration.deterministicSelection?.digestContract, SAMPLE_SELECTION_DIGEST_CONTRACT)
    && same(registration.deterministicSelection?.algorithmDescriptor, SAMPLE_ALGORITHM_DESCRIPTOR)
    && registration.deterministicSelection?.algorithmDescriptorHash === SAMPLE_ALGORITHM_HASH
    && same(registration.deterministicSelection?.digestGoldenVector, SAMPLE_SELECTION_GOLDEN_VECTOR), "sample algorithm descriptor or digest golden vector mismatch");
  check(errors, registration.machineReferenceWorkflow?.labelSourceType === "machine_reference_panel" && registration.machineReferenceWorkflow?.humanGold === false && registration.machineReferenceWorkflow?.correlatedSameModelErrorRisk === true, "machine-reference boundary mismatch");
  check(errors, same(registration.taxonomy?.defectCodes, EXPECTED_DEFECT_CODES), "17-code taxonomy order or membership mismatch");
  check(errors, registration.taxonomy?.severityByCode?.FALSE_ACCEPT_CORRECT_RESPONSE === "P0" && registration.taxonomy?.familyByCode?.FALSE_ACCEPT_CORRECT_RESPONSE === "RESPONSE_ACCEPTANCE", "FALSE_ACCEPT_CORRECT_RESPONSE formal P0 semantics mismatch");
  check(errors, same(registration.taxonomy?.acceptedCodeMapping?.FALSE_ACCEPT_CORRECT_RESPONSE, ["FALSE_ACCEPT_CORRECT_RESPONSE"]) && registration.taxonomy?.falseAcceptCorrectResponseMetricCreditAllowed === true, "FALSE_ACCEPT_CORRECT_RESPONSE metric eligibility mismatch");
  check(errors, registration.taxonomy?.findingMetricKey === "UNIQUE(itemId,findingId,family,code)" && registration.taxonomy?.findingIdentityRequiresEvidenceLocator === true, "finding identity boundary mismatch");
  check(errors, registration.analysis?.thresholds?.surfaceSensitivityOneSidedWilsonLcb95AtLeast === 0.9, "surface sensitivity threshold mismatch");
  check(errors, registration.analysis?.thresholds?.specificityOneSidedWilsonLcb95AtLeast === 0.95 && registration.analysis?.thresholds?.equivalentFalsePositiveRateOneSidedWilsonUcb95AtMost === 0.05, "specificity/FPR thresholds mismatch");
  check(errors, registration.analysis?.thresholds?.familyRecallConservativeDecisionLcb95AtLeast === 0.85 && registration.analysis?.thresholds?.exactCodeAndFamilyRecallConservativeDecisionLcb95AtLeast === 0.85, "finding threshold mismatch");
  check(errors, registration.analysis?.thresholds?.p1RecallConservativeDecisionLcb95AtLeast === 0.9 && registration.analysis?.thresholds?.p2MissedOrUnresolvedConservativeDecisionUcb95AtMost === 0.1, "severity threshold mismatch");
  check(errors, same(registration.analysis?.decisionStatuses, EXPECTED_DECISIONS) && registration.analysis?.ca60DecisionCeiling === "INCONCLUSIVE_MACHINE_REFERENCE", "decision vocabulary/ceiling mismatch");
  check(errors, registration.analysis?.missingData?.finiteOperationalCodeCount === 17 && registration.analysis?.missingData?.maximumUnifiedNonresolvedItems === 3, "finite missing universe mismatch");
  check(errors, registration.analysis?.missingData?.unifiedNonresolvedUniverseFormula === UNIFIED_NONRESOLVED_UNIVERSE_FORMULA
    && registration.analysis?.missingData?.surfaceWorldEnumerationMethod === SURFACE_WORST_CASE_METHOD
    && registration.analysis?.missingData?.findingWorstCaseMethod === FINDING_WORST_CASE_METHOD
    && registration.analysis?.missingData?.integrityLimitExceededMetricMethod === INTEGRITY_LIMIT_EXCEEDED_WORST_CASE_METHOD
    && same(registration.analysis?.missingData?.integrityLimitExceededMetricBounds, { lower: 0, upper: 1 }), "counterfactual method contract mismatch");
  check(errors, registration.analysis?.missingData?.maximumAdversarialFamilyFindingsPerNonresolvedItem === 17 && registration.analysis?.missingData?.maximumAdversarialExactFindingsPerNonresolvedItem === 17 && registration.analysis?.missingData?.maximumAdversarialP1FindingsPerNonresolvedItem === 7 && registration.analysis?.missingData?.maximumAdversarialP2FindingsPerNonresolvedItem === 4, "finite counterfactual maxima mismatch");
  check(errors, registration.crossArtifactIntegrity?.unifiedNonresolvedUniverse?.formula === "missingReceiptItemCount + unresolvedReferenceItemCount + invalidItemCount" && registration.crossArtifactIntegrity?.unifiedNonresolvedUniverse?.maximum === 3 && registration.crossArtifactIntegrity?.completeReceiptFloor === 57, "unified nonresolved integrity universe mismatch");
  check(errors, registration.providerControls?.firstProviderExecutionAllowed === false && registration.executionLifecycle?.firstProviderCallProhibitedByThisDesignArtifact === true, "design artifact must prohibit provider execution");
  const c0RandomAudit = registration.providerControls?.deepSeekEnvelope?.c0PrimeRandomAudit;
  check(errors, same(c0RandomAudit?.digestContract, C0_AUDIT_SELECTION_DIGEST_CONTRACT)
    && same(c0RandomAudit?.algorithmDescriptor, C0_AUDIT_ALGORITHM_DESCRIPTOR)
    && c0RandomAudit?.algorithmDescriptorHash === C0_AUDIT_ALGORITHM_HASH
    && same(c0RandomAudit?.digestGoldenVector, C0_AUDIT_SELECTION_GOLDEN_VECTOR), "C0 audit algorithm descriptor or digest golden vector mismatch");
  check(errors, same(registration.providerControls?.frozenRoleContracts, expectedFrozenRoleContracts()), "provider role contract mismatch");
  check(errors, same([...registration.interfaces?.schemaTitles ?? []].sort(), EXPECTED_SCHEMA_TITLES), "registration interface title set mismatch");
  check(errors, registration.interfaces?.structuralSchemaValidationAloneSufficient === false, "semantic validation must remain required");
  check(errors, same(registration.freezeChain, ["DESIGN_REGISTRATION_V3", "FRAME_REGISTRATION", "SAMPLE_REGISTRATION", "QWEN_AUTHORIZATION", "REFERENCE_LABEL_SEAL", "DEEPSEEK_AUTHORIZATION", "EXECUTION_REGISTRATION"]), "freeze chain mismatch");
  check(errors, registration.hashDependencyDag?.cycleFree === true
    && hashDependencyDagIsAcyclic(registration.hashDependencyDag)
    && registration.hashDependencyDag?.dagDefinitionHash === sha256Hex(canonicalJson({
      nodes: registration.hashDependencyDag.nodes,
      edges: registration.hashDependencyDag.edges,
    }))
    && registration.hashDependencyDag?.naturalSchemaDerivedHashFieldsStructuralOnly === true
    && registration.hashDependencyDag?.naturalSchemaExcludesRegistrationSectionCatalogSetAndSelfHashLiterals === true
    && registration.hashDependencyDag?.registrationExcludesExternalStatisticalPowerArtifactHash === true
    && registration.hashDependencyDag?.statisticalPowerBindsFinalDesignRegistrationHash === true
    && registration.hashDependencyDag?.activePointerIsMutableAndNotAFrozenRegistration === true
    && !registration.hashDependencyDag?.edges?.some((edge) => [
      "STATISTICAL_POWER_ARTIFACT->DESIGN_REGISTRATION_HASH",
      "DESIGN_REGISTRATION_HASH->JSON_SCHEMA_BYTES_WITH_DERIVED_HASH_FIELDS_STRUCTURAL_ONLY",
      "CANONICAL_SCHEMA_HASHES_AND_SCHEMA_SET_HASH->JSON_SCHEMA_BYTES_WITH_DERIVED_HASH_FIELDS_STRUCTURAL_ONLY",
    ].includes(edge)), "hash dependency DAG is cyclic or reverse-binds a downstream hash into schema or design");
}

function validatePower(registration, power, errors) {
  const expected = buildStatisticalPower(registration.registrationHash);
  check(errors, same(power, expected), "power artifact drift from deterministic frozen calculation");
  check(errors, power?.binaryThresholdOpportunity?.requiredTotal === 77 && power?.binaryThresholdOpportunity?.structurallyPossibleWithin60 === false, "77>60 structural proof mismatch");
  check(errors, nearlyEqual(power?.ca60WorstCasePrecision?.halfWidth, wilsonInterval(60, 30, 1.959963984540054).halfWidth), "CA60 Wilson precision mismatch");
  check(errors, power?.zeroMissOpportunity?.[0]?.requiredN === 59 && power?.planningScale?.recommendedIndependentClusters === 400, "P0/future planning evidence mismatch");
}

export async function validateArtifacts({ registration, power, schemas = [], providerEvents = [] }) {
  const errors = [];
  try {
    validateDesignSemantics(registration, errors);
    const computedSectionHashes = calculateFrozenContractHashes(registration);
    check(errors, same(registration.frozenContractHashes, computedSectionHashes), "frozen contract section hash mismatch");
    check(errors, registration.registrationHash === calculateRegistrationHash(registration), "registration self-hash mismatch");
    if (FROZEN_REGISTRATION_HASH !== "TO_BE_FROZEN_AFTER_V3_ASSEMBLY") {
      check(errors, registration.registrationHash === FROZEN_REGISTRATION_HASH, "frozen registration hash mismatch");
    }
    validateSchemaContracts(registration, schemas, errors);
    validatePower(registration, power, errors);
    check(errors, Array.isArray(providerEvents), "provider event ledger must be an array");
    if (providerEvents.length > 0) errors.push("provider event exists in the pre-execution design package");
  } catch (error) {
    errors.push(`design package validation failed closed: ${error.message}`);
  }
  return {
    ok: errors.length === 0,
    designId: registration?.designId ?? null,
    registrationHash: registration?.registrationHash ?? null,
    schemaCount: schemas.length,
    providerEventCount: Array.isArray(providerEvents) ? providerEvents.length : null,
    thresholdFreezePrecedesProviderEvents: Array.isArray(providerEvents) && providerEvents.length === 0,
    decisionCeiling: registration?.scope?.claimCeiling ?? null,
    errors,
  };
}

async function loadJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function loadPackage() {
  const registration = await loadJson(path.join(packageDirectory, "design-registration.json"));
  const power = await loadJson(path.join(packageDirectory, "statistical-power.json"));
  const schemaDirectory = path.join(packageDirectory, "schemas");
  const schemaNames = (await readdir(schemaDirectory)).filter((name) => name.endsWith(".schema.json")).sort();
  const schemas = await Promise.all(schemaNames.map((name) => loadJson(path.join(schemaDirectory, name))));
  const rootJsonNames = (await readdir(packageDirectory)).filter((name) => name.endsWith(".json") && !["design-registration.json", "statistical-power.json"].includes(name));
  const rootJson = await Promise.all(rootJsonNames.map((name) => loadJson(path.join(packageDirectory, name))));
  const providerEvents = rootJson.filter((artifact) => artifact.schemaVersion === "ProviderAttemptReceiptV1");
  return { registration, power, schemas, providerEvents };
}

async function main() {
  const unknown = process.argv.slice(2).filter((argument) => argument !== "--json");
  if (unknown.length > 0) throw new Error(`Unknown argument(s): ${unknown.join(", ")}`);
  const result = await validateArtifacts(await loadPackage());
  if (process.argv.includes("--json")) process.stdout.write(`${JSON.stringify(result)}\n`);
  else if (result.ok) process.stdout.write(`VALID ${result.designId} ${result.registrationHash}; schemas=${result.schemaCount}; providerEvents=${result.providerEventCount}; ceiling=${result.decisionCeiling}\n`);
  else process.stderr.write(`INVALID ${result.designId}\n${result.errors.map((error) => `- ${error}`).join("\n")}\n`);
  if (!result.ok) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
