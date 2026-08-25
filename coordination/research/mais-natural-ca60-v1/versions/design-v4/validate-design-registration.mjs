#!/usr/bin/env node

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  calculateArtifactHash,
  canonicalJson,
  CLAIM_SCOPE_CEILING_V4,
  DECISION_CEILING_V4,
  DEEPSEEK_ROLE_CONTRACTS,
  DESIGN_ID,
  DESIGN_SCHEMA_VERSION,
  FINDING_UNIDENTIFIED_METHOD,
  FINDING_WORST_CASE_METHOD,
  FROZEN_METHOD_COMPONENT_ROOTS_V4,
  FROZEN_METHOD_COMPONENT_ROOTS_V4_HASH,
  INTEGRITY_LIMIT_EXCEEDED_WORST_CASE_METHOD,
  PREDECESSOR_REGISTRATION_HASH,
  PROVIDER_FIELD_PRESENCE_CONTRACT_V4,
  QWEN_ROLE_CONTRACTS,
  SAMPLE_ITEM_PSEUDONYM_FORMULA_V4,
  SURFACE_COUNTERFACTUAL_ENUMERATION_RULE,
  SURFACE_WORST_CASE_METHOD,
  UNIFIED_NONRESOLVED_UNIVERSE_FORMULA,
  providerRequestTemplateHash,
  sha256Hex,
  OWNER_AUTHORIZATION_TEMPLATES_V4,
  FROZEN_PUBLIC_LIMITATIONS_V4,
} from "./design-contract.mjs";
import {
  C0_AUDIT_ALGORITHM_DESCRIPTOR,
  C0_AUDIT_ALGORITHM_HASH,
  C0_AUDIT_SELECTION_DIGEST_CONTRACT,
  C0_AUDIT_SELECTION_GOLDEN_VECTOR,
  RUNTIME_SOURCE_ENUMERATION_EVIDENCE_CONTRACT,
  RUNTIME_SOURCE_ENUMERATION_EVIDENCE_CONTRACT_HASH,
  RUNTIME_SOURCE_ENUMERATION_GRADES,
  SAMPLE_ALGORITHM_DESCRIPTOR,
  SAMPLE_ALGORITHM_HASH,
  SAMPLE_SELECTION_DIGEST_CONTRACT,
  SAMPLE_SELECTION_GOLDEN_VECTOR,
} from "./sample-contract.mjs";

const packageDirectory = path.dirname(fileURLToPath(import.meta.url));
const BASELINE_SHA = "ea67cac702c47b971666766ae13fe2a5494377f1";
const CANDIDATE_ASSEMBLY_TIMESTAMP = "2026-08-25T03:24:15.000Z";
const THRESHOLD_FREEZE_TIMESTAMP = "2026-08-25T03:20:00.000Z";
const PRIOR_NATURAL_DESIGN_SHA256 = "85bc51cec9e160c1a23e94e671c85d2de4b52e8b2b8e9afcbcf04b7b19528867";
const PRESERVATION_ARCHIVE_SHA256 = "2656f336387ed85c495a6b08b96fdf1e34f1942f0e1b3f83421fdab7f7dd0c71";
// Replaced only after the owner route decision and a complete independently
// reviewed V4 freeze. The current candidate has no authoritative self-hash.
const FROZEN_REGISTRATION_HASH = "TO_BE_FROZEN_AFTER_V4_ASSEMBLY";
const EXPECTED_SCHEMA_TITLES = [
  "AssetEgressLedgerV1",
  "C0ExecutionSetV1",
  "C0RandomAuditSelectionV1",
  "C0TriggerInputV1",
  "ClaimBoundaryReviewReceiptV1",
  "ClusterAuditReceiptV1",
  "CompletedItemCommitMarkerV1",
  "CounterfactualLedgerV1",
  "CredentialReadinessReceiptV1",
  "DeepSeekRoleOutputV1",
  "DeepSeekRouteProbeAuthorizationV1",
  "DeepSeekRouteProbeReceiptV1",
  "ExecutionDeviationEvidenceV1",
  "ExecutionRegistrationV1",
  "FinalEvaluationReceiptV1",
  "FrameFailureLedgerV1",
  "FrameRegistrationV1",
  "IndependentReviewReceiptV1",
  "ItemEvaluationResultV1",
  "ItemReferenceLabelSealV1",
  "LineageRuleApprovalV1",
  "MachineReferenceLabelV1",
  "MissingReceiptItemBundleV1",
  "NaturalCaPilotDesignRegistrationV4",
  "PersistedArtifactDefinitionsV1",
  "PreExecutionStateV1",
  "PredecessorPackageInventoryV1",
  "ProviderAttemptReceiptV1",
  "ProviderAuthorizationV1",
  "ProviderLogicalRequestV1",
  "ProviderWireEvidenceV1",
  "ReferenceLabelSealV1",
  "RightsDecisionTableV1",
  "RunnerPersistenceProofV1",
  "RuntimeConfigSnapshotV1",
  "RuntimeExtractionSnapshotV1",
  "RuntimeGradeProjectionInvocationLeafV1",
  "RuntimeSourceEnumerationReceiptV1",
  "RuntimeSourceLeafV1",
  "RuntimeSourceModuleManifestV1",
  "RuntimeThreeRouteParityReceiptV1",
  "SampleManifestV1",
  "SampleManifestV2",
  "SamplingFrameRowV1",
  "SamplingFrameRowV2",
].sort();
const PRODUCTION_EMITTER_SOURCE_PATHS = Object.freeze([
  "design-contract.mjs",
  "sample-contract.mjs",
  "review-gate.mjs",
]);
const CLOSED_PARENT_SCHEMA_MAPPINGS = Object.freeze({
  A11C0ReviewRecomputationV4: ["PersistedArtifactDefinitionsV1", "#/$defs/A11C0ReviewRecomputationV4"],
  AggregatePublicationAuthorizationStatusV1: ["PersistedArtifactDefinitionsV1", "#/$defs/AggregatePublicationAuthorizationStatusV1"],
  BPrimeAuthoritativeReducerV1: ["PersistedArtifactDefinitionsV1", "#/$defs/BPrimeAuthoritativeReducerV1"],
  BPrimeCritiqueArtifactV1: ["PersistedArtifactDefinitionsV1", "#/$defs/BPrimeCritiqueArtifactV1"],
  BPrimeCritiqueEvidenceV1: ["C0TriggerInputV1", "#/properties/bPrimeCritique"],
  BPrimeRevisionEvidenceV1: ["C0TriggerInputV1", "#/properties/bPrimeRevision"],
  BPrimeRevisionLogicalRequestV1: ["PersistedArtifactDefinitionsV1", "#/$defs/BPrimeRevisionLogicalRequestV1"],
  C0LocalDeterministicEvidenceV1: ["C0TriggerInputV1", "#/properties/localDeterministicEvidence"],
  C0ReducedResultV1: ["PersistedArtifactDefinitionsV1", "#/$defs/C0ReducedResultV1"],
  C0TriggerDecisionV1: ["PersistedArtifactDefinitionsV1", "#/$defs/C0TriggerDecisionV1"],
  C0ValidatedScopeV1: ["C0TriggerInputV1", "#/properties/validatedScope"],
  CleanSourceEvidenceV1: ["PersistedArtifactDefinitionsV1", "#/$defs/CleanSourceEvidenceV1"],
  DependencyClosureRunnerReceiptV1: ["PersistedArtifactDefinitionsV1", "#/$defs/DependencyClosureRunnerReceiptV1"],
  DependencyClosureTrustDescriptorV1: ["PersistedArtifactDefinitionsV1", "#/$defs/DependencyClosureTrustDescriptorV1"],
  ClusterAuditV1: ["PersistedArtifactDefinitionsV1", "#/$defs/ClusterAuditV1"],
  FrameAssetEgressLedgerEntryV2: ["PersistedArtifactDefinitionsV1", "#/$defs/FrameAssetEgressLedgerEntryV2"],
  FrameFreezeEvidenceV2: ["PersistedArtifactDefinitionsV1", "#/$defs/FrameFreezeEvidenceV2"],
  FrameFreezeEvidenceV3: ["PersistedArtifactDefinitionsV1", "#/$defs/FrameFreezeEvidenceV3"],
  FrameItemEgressDecisionV3: ["PersistedArtifactDefinitionsV1", "#/$defs/FrameItemEgressDecisionV3"],
  FrameItemLineageDecisionV1: ["PersistedArtifactDefinitionsV1", "#/$defs/FrameItemLineageDecisionV1"],
  FrameItemPreflightV1: ["PersistedArtifactDefinitionsV1", "#/$defs/FrameItemPreflightV1"],
  IndependentRawRecomputationV1: ["PersistedArtifactDefinitionsV1", "#/$defs/IndependentRawRecomputationV1"],
  IndependentVerifierProofV1: ["PersistedArtifactDefinitionsV1", "#/$defs/IndependentVerifierProofV1"],
  ItemEgressScreenEvidenceV2: ["PersistedArtifactDefinitionsV1", "#/$defs/ItemEgressScreenEvidenceV2"],
  MachineReferenceSolveV1: ["PersistedArtifactDefinitionsV1", "#/$defs/MachineReferenceSolveV1"],
  MetricInputLedgerV1: ["PersistedArtifactDefinitionsV1", "#/$defs/MetricInputLedgerV1"],
  NaturalCaPredecessorGoldenHashesV1: ["PersistedArtifactDefinitionsV1", "#/$defs/NaturalCaPredecessorGoldenHashesV1"],
  NaturalCaSourceLineagePreflightAggregateV1: ["PersistedArtifactDefinitionsV1", "#/$defs/NaturalCaSourceLineagePreflightAggregateV1"],
  NaturalCaStatisticalPowerV1: ["PersistedArtifactDefinitionsV1", "#/$defs/NaturalCaStatisticalPowerV1"],
  ObservedEvaluationLedgerV1: ["PersistedArtifactDefinitionsV1", "#/$defs/ObservedEvaluationLedgerV1"],
  PreResultExclusionEvidenceInventoryV1: ["PersistedArtifactDefinitionsV1", "#/$defs/PreResultExclusionEvidenceInventoryV1"],
  PreResultExclusionEvidenceV2: ["PersistedArtifactDefinitionsV1", "#/$defs/PreResultExclusionEvidenceV2"],
  PreResultExclusionRunnerReceiptV1: ["PersistedArtifactDefinitionsV1", "#/$defs/PreResultExclusionRunnerReceiptV1"],
  PreResultReplacementV1: ["PersistedArtifactDefinitionsV1", "#/$defs/PreResultReplacementV1"],
  PreResultReplacementV2: ["PersistedArtifactDefinitionsV1", "#/$defs/PreResultReplacementV2"],
  ProtectedReviewInputRootV1: ["PersistedArtifactDefinitionsV1", "#/$defs/ProtectedReviewInputRootV1"],
  ProtectedReviewInputRootV4: ["PersistedArtifactDefinitionsV1", "#/$defs/ProtectedReviewInputRootV4"],
  PublicAggregateReportV1: ["PersistedArtifactDefinitionsV1", "#/$defs/PublicAggregateReportV1"],
  RawToRuntimeQuestionConverterRunnerReceiptV1: ["PersistedArtifactDefinitionsV1", "#/$defs/RawToRuntimeQuestionConverterRunnerReceiptV1"],
  RightsEgressDecisionTableV1: ["PersistedArtifactDefinitionsV1", "#/$defs/RightsEgressDecisionTableV1"],
  RuntimeConfigEvidenceV1: ["PersistedArtifactDefinitionsV1", "#/$defs/RuntimeConfigEvidenceV1"],
  RouteExecutionTrustDescriptorV2: ["PersistedArtifactDefinitionsV1", "#/$defs/RouteExecutionTrustDescriptorV2"],
  RuntimeQuestionToPublicQuestionRunnerReceiptV1: ["PersistedArtifactDefinitionsV1", "#/$defs/RuntimeQuestionToPublicQuestionRunnerReceiptV1"],
  RuntimeQuestionToResearchLeafNormalizerRunnerReceiptV1: ["PersistedArtifactDefinitionsV1", "#/$defs/RuntimeQuestionToResearchLeafNormalizerRunnerReceiptV1"],
  RuntimeSerializationFailureEvidenceV1: ["PersistedArtifactDefinitionsV1", "#/$defs/RuntimeSerializationFailureEvidenceV1"],
  RuntimeSourceEnumerationEvidenceContractV1: ["PersistedArtifactDefinitionsV1", "#/$defs/RuntimeSourceEnumerationEvidenceContractV1"],
  SampleBoundProtectedItemEnvelopeV1: ["PersistedArtifactDefinitionsV1", "#/$defs/SampleBoundProtectedItemEnvelopeV1"],
  SampleExecutionLedgerEntryV1: ["PersistedArtifactDefinitionsV1", "#/$defs/SampleExecutionLedgerEntryV1"],
  SampleExecutionLedgerV1: ["PersistedArtifactDefinitionsV1", "#/$defs/SampleExecutionLedgerV1"],
  SampleExecutionLedgerV2: ["PersistedArtifactDefinitionsV1", "#/$defs/SampleExecutionLedgerV2"],
  SampleManifestV3: ["PersistedArtifactDefinitionsV1", "#/$defs/SampleManifestV3"],
  SampleReplacementAuthorizationV1: ["PersistedArtifactDefinitionsV1", "#/$defs/SampleReplacementAuthorizationV1"],
  ScannerExecutionReceiptInventoryV1: ["PersistedArtifactDefinitionsV1", "#/$defs/ScannerExecutionReceiptInventoryV1"],
  ScannerExecutionReceiptV1: ["PersistedArtifactDefinitionsV1", "#/$defs/ScannerExecutionReceiptV1"],
  ThreeRouteSourceParityEvidenceV4: ["PersistedArtifactDefinitionsV1", "#/$defs/ThreeRouteSourceParityEvidenceV4"],
  ThreeRouteSourceParityEvidenceV5: ["PersistedArtifactDefinitionsV1", "#/$defs/ThreeRouteSourceParityEvidenceV5"],
  TransitiveSourceModuleManifestV1: ["PersistedArtifactDefinitionsV1", "#/$defs/TransitiveSourceModuleManifestV1"],
  TransitiveSourceModuleManifestV2: ["PersistedArtifactDefinitionsV1", "#/$defs/TransitiveSourceModuleManifestV2"],
  FrameRegistrationV2: ["PersistedArtifactDefinitionsV1", "#/$defs/FrameRegistrationV2"],
});
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

function productionSchemaVersionLiterals(productionSourceTexts) {
  if (!productionSourceTexts || typeof productionSourceTexts !== "object" || Array.isArray(productionSourceTexts)) return [];
  const versions = new Set();
  for (const sourcePath of PRODUCTION_EMITTER_SOURCE_PATHS) {
    const source = productionSourceTexts[sourcePath];
    if (typeof source !== "string") continue;
    for (const pattern of [
      /schemaVersion\s*:\s*["']([A-Za-z0-9_-]+)["']/gu,
      /schemaVersion\s*(?:===|!==)\s*["']([A-Za-z0-9_-]+)["']/gu,
    ]) {
      for (const match of source.matchAll(pattern)) versions.add(match[1]);
    }
  }
  return [...versions].sort();
}

function expectedEmittedArtifactSchemaMap(schemas) {
  const mappings = Object.fromEntries(schemas.map((schema) => [schema.title, {
    schemaPath: `schemas/${schema.title}.schema.json`,
    jsonPointer: "#",
    mappingKind: "STANDALONE_SCHEMA_ROOT",
  }]));
  for (const [schemaVersion, [parentTitle, jsonPointer]] of Object.entries(CLOSED_PARENT_SCHEMA_MAPPINGS)) {
    mappings[schemaVersion] = {
      schemaPath: `schemas/${parentTitle}.schema.json`,
      jsonPointer,
      mappingKind: "CLOSED_PARENT_DEFINITION",
    };
  }
  return Object.fromEntries(Object.entries(mappings).sort(([left], [right]) => left.localeCompare(right)));
}

function resolveJsonPointer(document, pointer) {
  if (pointer === "#") return document;
  if (!/^#(?:\/(?:[^/~]|~[01])*)+$/u.test(pointer)) throw new TypeError(`invalid schema JSON pointer: ${pointer}`);
  return pointer.slice(2).split("/").reduce((node, encodedToken) => {
    const token = encodedToken.replaceAll("~1", "/").replaceAll("~0", "~");
    if (!node || typeof node !== "object" || !Object.hasOwn(node, token)) throw new TypeError(`unresolved schema JSON pointer: ${pointer}`);
    return node[token];
  }, document);
}

function contractLiteralHash(value) {
  return sha256Hex(canonicalJson(value));
}

function frozenRoleContractProjection(provider, contracts, presenceContractHash, pseudonymFormulaHash) {
  return Object.fromEntries(Object.entries(contracts).map(([role, contract]) => {
    const roleContractHash = contractLiteralHash({
      provider,
      role,
      inputFieldNames: [...contract.inputFieldNames],
      promptHash: contract.promptHash,
      schemaHash: contract.schemaHash,
      presenceContractHash,
      pseudonymFormulaHash,
    });
    return [role, {
    inputFieldNames: [...contract.inputFieldNames],
    promptLiteral: contract.promptLiteral,
    promptHash: contract.promptHash,
    schemaLiteral: contract.schemaLiteral,
    schemaHash: contract.schemaHash,
      roleContractHash,
    }];
  }));
}

export function calculateProviderProjectionContract(registrationIndependent = true) {
  if (registrationIndependent !== true) throw new TypeError("provider projection roots must be derived only from frozen implementation exports");
  const fieldPresenceContractHash = contractLiteralHash(PROVIDER_FIELD_PRESENCE_CONTRACT_V4);
  const sampleItemPseudonymFormulaHash = contractLiteralHash(SAMPLE_ITEM_PSEUDONYM_FORMULA_V4);
  const qwen = frozenRoleContractProjection(
    "ALIBABA_CLOUD_MODEL_STUDIO",
    QWEN_ROLE_CONTRACTS,
    fieldPresenceContractHash,
    sampleItemPseudonymFormulaHash,
  );
  const deepSeek = frozenRoleContractProjection(
    "DEEPSEEK_DIRECT",
    DEEPSEEK_ROLE_CONTRACTS,
    fieldPresenceContractHash,
    sampleItemPseudonymFormulaHash,
  );
  const roleRoot = (contracts) => contractLiteralHash(Object.entries(contracts)
    .map(([role, contract]) => [role, contract.roleContractHash])
    .sort(([left], [right]) => left.localeCompare(right)));
  const qwenRoleContractRootHash = roleRoot(qwen);
  const deepSeekRoleContractRootHash = roleRoot(deepSeek);
  const rootSetPreimage = [
    ["ALIBABA_CLOUD_MODEL_STUDIO", qwenRoleContractRootHash],
    ["DEEPSEEK_DIRECT", deepSeekRoleContractRootHash],
    ["FIELD_PRESENCE_CONTRACT", fieldPresenceContractHash],
    ["SAMPLE_ITEM_PSEUDONYM_FORMULA", sampleItemPseudonymFormulaHash],
  ].sort(([left], [right]) => left.localeCompare(right));
  return {
    qwen,
    deepSeek,
    roots: {
      canonicalization: "RFC8785_JCS",
      byteEncoding: "UTF-8",
      digestAlgorithm: "SHA-256",
      roleOrdering: "LEXICOGRAPHIC_ASCENDING_BY_ROLE",
      rootSetOrdering: "LEXICOGRAPHIC_ASCENDING_BY_PREIMAGE_LABEL",
      roleContractHashPreimageFields: [
        "provider",
        "role",
        "inputFieldNames",
        "promptHash",
        "schemaHash",
        "presenceContractHash",
        "pseudonymFormulaHash",
      ],
      fieldPresenceContract: PROVIDER_FIELD_PRESENCE_CONTRACT_V4,
      fieldPresenceContractHash,
      sampleItemPseudonymFormula: SAMPLE_ITEM_PSEUDONYM_FORMULA_V4,
      sampleItemPseudonymFormulaHash,
      qwenRoleContractRootHash,
      deepSeekRoleContractRootHash,
      providerProjectionContractRootSetHash: contractLiteralHash(rootSetPreimage),
    },
  };
}

function expectedProviderRoleContractCatalog() {
  const projection = calculateProviderProjectionContract();
  const compactRoles = (provider, roles) => Object.fromEntries(Object.entries(roles).map(([role, contract]) => [role, {
    provider,
    role,
    inputFieldNames: contract.inputFieldNames,
    promptHash: contract.promptHash,
    schemaHash: contract.schemaHash,
    roleContractHash: contract.roleContractHash,
  }]));
  return {
    ...projection.roots,
    qwen: compactRoles("ALIBABA_CLOUD_MODEL_STUDIO", projection.qwen),
    deepSeek: compactRoles("DEEPSEEK_DIRECT", projection.deepSeek),
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

function plainDagIsAcyclic(dag) {
  if (!Array.isArray(dag?.nodes) || !Array.isArray(dag?.edges) || new Set(dag.nodes).size !== dag.nodes.length) return false;
  const indegree = new Map(dag.nodes.map((node) => [node, 0]));
  const adjacency = new Map(dag.nodes.map((node) => [node, []]));
  for (const edge of dag.edges) {
    const [from, to, ...extra] = String(edge).split("->");
    if (extra.length > 0 || !indegree.has(from) || !indegree.has(to)) return false;
    adjacency.get(from).push(to);
    indegree.set(to, indegree.get(to) + 1);
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
      implementationBaseline: registration.implementationBaseline,
      runtimeSourceBinding: registration.runtimeSourceBinding,
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
      freezeAndLaterBindDag: registration.freezeAndLaterBindDag,
      preExecutionState: registration.preExecutionState,
      executionChronology: registration.executionChronology,
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
  if (registrationHash !== null && !/^[0-9a-f]{64}$/u.test(registrationHash)) {
    throw new TypeError("statistical-power registration hash must be null for a candidate or a sealed SHA-256 hash");
  }
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
    bindingStatus: registrationHash === null
      ? "CANDIDATE_UNBOUND_PENDING_REGISTRATION_FREEZE"
      : "BOUND_TO_FROZEN_DESIGN_REGISTRATION",
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
  artifact.powerArtifactHash = registrationHash === null
    ? null
    : calculateArtifactHash(artifact, "powerArtifactHash");
  return artifact;
}

function canonicalSchemaHashCatalog(schemas) {
  return Object.fromEntries(schemas
    .map((schema) => [schema?.title ?? "UNTITLED_SCHEMA", sha256Hex(canonicalJson(schema))])
    .sort(([left], [right]) => left.localeCompare(right)));
}

function validateSchemaContracts(registration, schemas, productionSourceTexts, rootArtifacts, validationMode, errors) {
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
  const execution = schemas.find((schema) => schema.title === "ExecutionRegistrationV1");
  const wire = schemas.find((schema) => schema.title === "ProviderWireEvidenceV1");
  const probeAuthorization = schemas.find((schema) => schema.title === "DeepSeekRouteProbeAuthorizationV1");
  const probeReceipt = schemas.find((schema) => schema.title === "DeepSeekRouteProbeReceiptV1");
  check(errors, Array.isArray(auth?.allOf) && auth.allOf.length >= 2, "ProviderAuthorizationV1 provider conditionals missing");
  check(errors, Array.isArray(attempt?.allOf) && attempt.allOf.length >= 2, "ProviderAttemptReceiptV1 status/provider conditionals missing");
  check(errors, final?.required?.includes("unifiedNonresolvedItemCount"), "FinalEvaluationReceiptV1 unified nonresolved field missing");
  check(errors, review?.allOf?.some((entry) => entry?.if?.properties?.reviewStatus?.const === "CONCURRED"), "IndependentReviewReceiptV1 CONCURRED conditional missing");
  check(errors, execution?.required?.includes("qwenAttemptChainHash")
    && execution?.required?.includes("deepSeekRouteProbeReceiptHash")
    && execution?.properties?.deepSeekNaturalAttemptCountBeforeRegistration?.const === 0
    && execution?.properties?.firstDeepSeekNaturalItemAttemptAt?.type === "null", "ExecutionRegistrationV1 chronology fields missing");
  check(errors, wire?.required?.includes("logicalRequestHash")
    && wire?.required?.includes("wireRequestBodyHash")
    && wire?.required?.includes("rawWireResponseHash")
    && wire?.required?.includes("parsedProviderEnvelopeHash")
    && wire?.required?.includes("providerResponseId")
    && wire?.required?.includes("providerResponseModel")
    && wire?.required?.includes("finishReason")
    && wire?.required?.includes("providerUsage")
    && wire?.required?.includes("providerUsageHash")
    && wire?.required?.includes("extractedMessageContentHash")
    && wire?.required?.includes("parsedRolePayloadHash")
    && attempt?.required?.includes("providerUsageHash")
    && attempt?.properties?.rawUsage?.required?.includes("totalTokens")
    && !Object.hasOwn(wire?.properties ?? {}, "parsedProjectionHash")
    && !Object.hasOwn(wire?.properties ?? {}, "output"), "ProviderWireEvidenceV1 exact wire leaves missing");
  check(errors, probeAuthorization?.properties?.containsNaturalItemTextAuthorized?.const === false
    && probeReceipt?.properties?.containsNaturalItemText?.const === false, "DeepSeek route probe must structurally forbid natural item text");
  const emittedMap = expectedEmittedArtifactSchemaMap(schemas);
  const scannedProductionVersions = productionSchemaVersionLiterals(productionSourceTexts);
  const rootArtifactVersions = Array.isArray(rootArtifacts)
    ? rootArtifacts.map((artifact) => artifact?.schemaVersion).filter((value) => typeof value === "string")
    : [];
  const requiredMappedVersions = [...new Set([
    ...scannedProductionVersions,
    ...rootArtifactVersions,
    "MachineReferenceSolveV1",
  ])].sort();
  check(errors, registration?.interfaces?.persistedArtifactSchemaMappingRequired === true
    && registration?.interfaces?.unmappedPersistedArtifactDisposition === "FAIL_CLOSED"
    && same(registration?.interfaces?.emittedArtifactSchemaMap, emittedMap), "emitted artifact schema map mismatch");
  check(errors, same(registration?.interfaces?.productionEmitterSourcePaths, PRODUCTION_EMITTER_SOURCE_PATHS), "production emitter source path inventory mismatch");
  check(errors, PRODUCTION_EMITTER_SOURCE_PATHS.every((sourcePath) => typeof productionSourceTexts?.[sourcePath] === "string"), "production emitter source text missing");
  check(errors, same(registration?.interfaces?.productionSchemaVersionLiterals, scannedProductionVersions), "production schemaVersion literal inventory mismatch");
  check(errors, same(registration?.interfaces?.persistedArtifactSchemaVersions, Object.keys(emittedMap).sort()), "persisted artifact schema-version inventory mismatch");
  const schemaByPath = new Map(schemas.map((schema) => [`schemas/${schema.title}.schema.json`, schema]));
  for (const schemaVersion of requiredMappedVersions) {
    const mapping = registration?.interfaces?.emittedArtifactSchemaMap?.[schemaVersion];
    check(errors, mapping && typeof mapping === "object" && !Array.isArray(mapping), `${schemaVersion}: persisted artifact schema mapping missing`);
    if (!mapping || typeof mapping !== "object" || Array.isArray(mapping)) continue;
    check(errors, same(Object.keys(mapping).sort(), ["jsonPointer", "mappingKind", "schemaPath"]), `${schemaVersion}: schema mapping fields mismatch`);
    check(errors, ["STANDALONE_SCHEMA_ROOT", "CLOSED_PARENT_DEFINITION"].includes(mapping.mappingKind), `${schemaVersion}: schema mapping kind invalid`);
    const parentSchema = schemaByPath.get(mapping.schemaPath);
    check(errors, Boolean(parentSchema), `${schemaVersion}: schema mapping path missing from package`);
    if (!parentSchema) continue;
    try {
      const target = resolveJsonPointer(parentSchema, mapping.jsonPointer);
      check(errors, target?.type === "object" && target?.additionalProperties === false, `${schemaVersion}: mapped schema node must be a closed object`);
      check(errors, target?.properties?.schemaVersion?.const === schemaVersion && target?.required?.includes("schemaVersion"), `${schemaVersion}: mapped schema node identity mismatch`);
      if (mapping.mappingKind === "CLOSED_PARENT_DEFINITION") {
        check(errors, same([...(target.required ?? [])].sort(), Object.keys(target.properties ?? {}).sort()), `${schemaVersion}: parent definition must require its complete closed field set`);
      }
    } catch (error) {
      errors.push(`${schemaVersion}: ${error.message}`);
    }
  }
  const schemaHashes = canonicalSchemaHashCatalog(schemas);
  check(errors, registration?.interfaces?.schemaCanonicalization === "RFC8785_JCS_SHA256", "schema canonicalization contract mismatch");
  if (validationMode === "FROZEN_REGISTRATION") {
    check(errors, same(registration?.interfaces?.canonicalSchemaHashes, schemaHashes), "canonical schema hash catalog mismatch");
    check(errors, registration?.interfaces?.schemaSetHash === sha256Hex(canonicalJson(schemaHashes)), "canonical schema set hash mismatch");
  } else {
    check(errors, registration?.interfaces?.canonicalSchemaHashes === null
      && registration?.interfaces?.schemaSetHash === null
      && registration?.interfaces?.staleSupersededDraftEvidence?.disposition === "NON_AUTHORITATIVE_PRE_OWNER_DECISION_HASHES_DO_NOT_AUTHORIZE_FREEZE_OR_EXECUTION", "candidate schema roots must remain unsealed with stale evidence explicitly non-authoritative");
  }
}

function validateDesignSemantics(registration, validationMode, errors) {
  check(errors, registration.schemaVersion === DESIGN_SCHEMA_VERSION && registration.designId === DESIGN_ID && registration.version === 4, "design identity mismatch");
  check(errors, registration.designKind === "PRE_EXECUTION_DESIGN_REGISTRATION_CANDIDATE", "design kind mismatch");
  check(errors, registration.lifecycleStatus === "DRAFT_OWNER_DECISIONS_PENDING"
    && registration.freezeAllowed === false
    && same(registration.blockingDecisionCodes, ["QWEN_ENDPOINT_AND_DATA_REGION_OWNER_DECISION_PENDING"]), "candidate lifecycle or owner-decision blocker mismatch");
  const publicationRootFields = [
    "activeDesignRegistrationHash",
    "activeExecutionRegistrationHash",
    "latestFinalEvaluationReceiptHash",
    "referenceSealHash",
    "frameRegistrationHash",
    "sampleManifestHash",
    "thresholdHash",
    "taxonomyHash",
    "labelSchemaHash",
    "adjudicationMethodHash",
    "severityRuleHash",
    "promptSetHash",
    "schemaSetHash",
    "runnerHash",
    "adapterHash",
    "statisticalPowerHash",
    "designSupersedesHash",
    "methodComponentRootSetHash",
    "reviewLedgerHeadHash",
    "finalFinishedAt",
  ];
  const publicationContract = registration.interfaces?.publicationAuthorizationContract;
  check(errors, registration.publicationAuthorizationStatus === "BLOCKED_PENDING_A21_PROTECTED_CUSTODY_REGISTRY"
    && same(registration.publicationAuthorizationBlockers, ["EXECUTION_CUSTODY_REGISTRY_NOT_IMPLEMENTED"])
    && registration.executionLifecycle?.publicationAuthorizationStatus === "BLOCKED_PENDING_A21_PROTECTED_CUSTODY_REGISTRY"
    && registration.executionLifecycle?.publicationAuthorizationAvailable === false
    && same(registration.executionLifecycle?.publicationAuthorizationBlockers, ["EXECUTION_CUSTODY_REGISTRY_NOT_IMPLEMENTED"])
    && publicationContract?.statusSchemaVersion === "AggregatePublicationAuthorizationStatusV1"
    && publicationContract?.allowed === false
    && publicationContract?.status === "BLOCKED_PENDING_A21_PROTECTED_CUSTODY_REGISTRY"
    && publicationContract?.authorizationAvailable === false
    && publicationContract?.blockingCode === "EXECUTION_CUSTODY_REGISTRY_NOT_IMPLEMENTED"
    && same(publicationContract?.blockerCodes, ["EXECUTION_CUSTODY_REGISTRY_NOT_IMPLEMENTED"])
    && publicationContract?.currentGateClassification === "CONSISTENCY_VALIDATOR_ONLY_NOT_PUBLICATION_AUTHORIZATION"
    && publicationContract?.callerSuppliedCustodyRootsAuthorized === false
    && publicationContract?.protectedCustodyRegistryRequired === true
    && publicationContract?.protectedCustodyRegistryOwner === "A21"
    && publicationContract?.requiredCustodyArtifactSchema === "ProtectedExecutionCustodyRegistryV1"
    && publicationContract?.protectedRegistryRootHash === null
    && publicationContract?.runnerHash === null
    && publicationContract?.requiredBefore === "AGGREGATE_PUBLICATION_AUTHORIZATION"
    && publicationContract?.laterBound === true
    && same(publicationContract?.exactPinnedRootFields, publicationRootFields)
    && registration.publicReport?.publicationAuthorizationStatus === publicationContract?.status
    && registration.publicReport?.currentGateClassification === publicationContract?.currentGateClassification
    && registration.publicReport?.aggregateExportAuthorized === false
    && registration.independentReview?.publicationAuthorizationStatus === publicationContract?.status
    && typeof registration.independentReview?.reviewConsistencyPrerequisite === "string"
    && !Object.hasOwn(registration.independentReview ?? {}, "exportGate")
    && !registration.interfaces?.strongValidators?.includes("canExportAggregateReport")
    && registration.interfaces?.strongValidators?.includes("validateAggregatePublicationConsistencyV1"), "publication authorization custody contract mismatch");
  check(errors, registration.baselineCommitSha === BASELINE_SHA, "baseline binding mismatch");
  check(errors, registration.frozenAt === null && registration.registrationHash === null && registration.frozenContractHashes === null, "candidate must not expose an active frozenAt, registrationHash, or frozen contract roots");
  check(errors, isStrictRfc3339Instant(registration.candidateAssembledAt)
    && registration.candidateAssembledAt === CANDIDATE_ASSEMBLY_TIMESTAMP, "candidate assembly timestamp mismatch");
  check(errors, isStrictRfc3339Instant(registration.thresholdsFrozenAt)
    && registration.thresholdsFrozenAt === THRESHOLD_FREEZE_TIMESTAMP
    && Date.parse(registration.thresholdsFrozenAt) <= Date.parse(registration.candidateAssembledAt), "threshold freeze timestamp mismatch");
  if (validationMode === "FROZEN_REGISTRATION") {
    errors.push("frozen registration required but QWEN_ENDPOINT_AND_DATA_REGION_OWNER_DECISION_PENDING blocks sealing");
  }
  check(errors, registration.implementationBaseline?.commit === BASELINE_SHA
    && registration.implementationBaseline?.purpose === "DESIGN_IMPLEMENTATION_AND_OFFLINE_TEST_BASELINE_ONLY"
    && registration.implementationBaseline?.containsFrozenRuntimeSourceSnapshot === false
    && registration.implementationBaseline?.authorizesProviderExecution === false, "design implementation baseline boundary mismatch");
  check(errors, registration.proposedSupersedes?.registrationHash === PREDECESSOR_REGISTRATION_HASH
    && registration.proposedSupersedes?.designId === "MAIS-NATURAL-CA60-V3"
    && registration.proposedSupersedes?.currentDisposition === "ACTIVE_DESIGN_REGISTRATION_V3_NO_PROVIDER_EXECUTION"
    && registration.proposedSupersedes?.targetDispositionAfterValidFreeze === "SUPERSEDED_NOT_EXECUTED"
    && registration.proposedSupersedes?.proposalStatus === "PROPOSED_ONLY_REQUIRES_OWNER_ROUTE_DECISION_RECOMPUTATION_AND_INDEPENDENT_REVIEW"
    && registration.proposedSupersedesRegistrationHash === PREDECESSOR_REGISTRATION_HASH
    && registration.proposedSupersedesDispositionAfterValidFreeze === "SUPERSEDED_NOT_EXECUTED"
    && !Object.hasOwn(registration, "supersedes")
    && !Object.hasOwn(registration, "supersedesRegistrationHash")
    && !Object.hasOwn(registration, "supersedesDisposition")
    && registration.predecessorPackageInventoryRootHash === "0aa952f44ee0558b0b5054b04bb669951e63e7c63a74a5a68881e70a3a5da471", "V3 predecessor inventory binding mismatch");
  check(errors, registration.provenance?.preservedPriorNaturalDesignSha256 === PRIOR_NATURAL_DESIGN_SHA256, "prior design hash mismatch");
  check(errors, registration.provenance?.preservationArchiveSha256 === PRESERVATION_ARCHIVE_SHA256, "preservation archive hash mismatch");
  check(errors, registration.scope?.framePopulation === "ALL_CA_RUNTIME_VISIBLE_QUESTIONS" && registration.scope?.estimandPopulation === "EGRESS_ELIGIBLE_CA_RUNTIME_VISIBLE_QUESTIONS", "frame/estimand population separation mismatch");
  check(errors, registration.scope?.targetClusterCount === 60
    && registration.scope?.decisionCeiling === DECISION_CEILING_V4
    && registration.scope?.claimScopeCeiling === CLAIM_SCOPE_CEILING_V4
    && !Object.hasOwn(registration.scope ?? {}, "claimCeiling"), "CA60 decision/claim-scope ceilings mismatch");
  check(errors, registration.runtimeSourceBinding?.status === "LATER_BIND_REQUIRED"
    && registration.runtimeSourceBinding?.sourceCommit === null
    && registration.runtimeSourceBinding?.runtimeConfigHash === null
    && registration.runtimeSourceBinding?.frameFreezeAllowed === false
    && registration.runtimeSourceBinding?.currentDirtyRootMayBeUsedForFreeze === false, "runtime source must remain later-bound and fail closed");
  check(errors, registration.runtimePopulation?.sourceCommit === null && registration.runtimePopulation?.curriculumProfile === "US_CA_MATH" && registration.runtimePopulation?.actor === "AUTHENTICATED_STUDENT", "runtime population binding mismatch");
  check(errors, registration.runtimePopulation?.gradeProjectionCount === 13
    && same(registration.runtimePopulation?.gradeProjections, RUNTIME_SOURCE_ENUMERATION_GRADES)
    && registration.runtimePopulation?.maxAnswerChoices === 0
    && registration.runtimePopulation?.accommodationOptionTruncation === false, "runtime projection/accommodation mismatch");
  check(errors, same(registration.eligibility?.exclusionCodes, EXPECTED_EXCLUSIONS) && registration.eligibility?.exclusionListClosed === true, "closed exclusion vocabulary mismatch");
  check(errors, registration.eligibility?.missingAnswerOptionsExplanationRemainIncluded === true && registration.eligibility?.unresolvedRuntimeVisibleSerializationFailureBlocksFreeze === true, "inclusion or frame-failure disposition mismatch");
  check(errors, same(registration.eligibility?.allowedResponseForms, ["multiple-choice", "fill-in", "short-answer"]), "response-form vocabulary mismatch");
  check(errors, same(registration.eligibility?.allowedDifficulties, ["Low", "Medium", "High"]), "difficulty vocabulary mismatch");
  check(errors, registration.homologyClustering?.blockers?.frameShareStrictlyGreaterThan === 0.05 && registration.homologyClustering?.blockers?.topicBridgeCountStrictlyGreaterThan === 2, "cluster blockers mismatch");
  check(errors, registration.deterministicSelection?.resultBlind === true && registration.deterministicSelection?.rerollAfterAnyLabelOrResult === "FORBIDDEN" && registration.deterministicSelection?.selectionRootExcludesArtifactTimestamps === true, "selection blindness/timestamp contract mismatch");
  check(errors, registration.interfaces?.semanticExecutionSamplingFrameSchema === "SamplingFrameRowV2"
    && registration.interfaces?.semanticExecutionFrameRegistrationSchema === "FrameRegistrationV2"
    && registration.interfaces?.semanticExecutionInitialSampleManifestSchema === "SampleManifestV2"
    && registration.interfaces?.semanticExecutionReplacementSampleManifestSchema === "SampleManifestV3"
    && same(registration.interfaces?.legacyStructuralSchemaTitles, ["SamplingFrameRowV1", "SampleManifestV1", "FrameRegistrationV1"])
    && registration.interfaces?.legacyStructuralSchemasAcceptedForExecution === false, "semantic frame/sample schema-version routing mismatch");
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
  check(errors, same(registration.analysis?.decisionStatuses, EXPECTED_DECISIONS) && registration.analysis?.ca60DecisionCeiling === DECISION_CEILING_V4, "decision vocabulary/ceiling mismatch");
  const missingData = registration.analysis?.missingData;
  const forbiddenFiniteFindingCaps = [
    "finiteOperationalCodeCount",
    "operationalMetricCodes",
    "perMissingItemMaximumUnmatchedOpportunities",
    "maximumAdversarialFamilyFindingsPerNonresolvedItem",
    "maximumAdversarialExactFindingsPerNonresolvedItem",
    "maximumAdversarialP1FindingsPerNonresolvedItem",
    "maximumAdversarialP2FindingsPerNonresolvedItem",
    "maximumAtThreeMissingItems",
  ];
  check(errors, missingData?.maximumUnifiedNonresolvedItems === 3
    && missingData?.surfaceWorldMaximumAtUnifiedNonresolvedLimit === 64
    && forbiddenFiniteFindingCaps.every((field) => !Object.hasOwn(missingData ?? {}, field)), "missing-data contract must not fabricate finite finding caps");
  check(errors, registration.analysis?.missingData?.unifiedNonresolvedUniverseFormula === UNIFIED_NONRESOLVED_UNIVERSE_FORMULA
    && registration.analysis?.missingData?.surfaceCounterfactualEnumerationRule === SURFACE_COUNTERFACTUAL_ENUMERATION_RULE
    && registration.analysis?.missingData?.surfaceWorldEnumerationMethod === SURFACE_WORST_CASE_METHOD
    && registration.analysis?.missingData?.findingWorstCaseMethod === FINDING_WORST_CASE_METHOD
    && registration.analysis?.missingData?.findingUnidentifiedMethod === FINDING_UNIDENTIFIED_METHOD
    && same(registration.analysis?.missingData?.unidentifiedFindingDecisionBound, { lower: 0, upper: 1 })
    && registration.analysis?.missingData?.unidentifiedFindingMetricStatus === "UNDERPOWERED"
    && registration.analysis?.missingData?.integrityLimitExceededMetricMethod === INTEGRITY_LIMIT_EXCEEDED_WORST_CASE_METHOD
    && same(registration.analysis?.missingData?.integrityLimitExceededMetricBounds, { lower: 0, upper: 1 }), "counterfactual method contract mismatch");
  check(errors, same(registration.analysis?.frozenMethodComponentRoots, FROZEN_METHOD_COMPONENT_ROOTS_V4)
    && registration.analysis?.frozenMethodComponentRootsHash === FROZEN_METHOD_COMPONENT_ROOTS_V4_HASH
    && registration.analysis?.frozenMethodComponentRootCanonicalization === "RFC8785_JCS_SHA256", "frozen method component root binding mismatch");
  check(errors, registration.crossArtifactIntegrity?.unifiedNonresolvedUniverse?.formula === "missingReceiptItemCount + unresolvedReferenceItemCount + invalidItemCount" && registration.crossArtifactIntegrity?.unifiedNonresolvedUniverse?.maximum === 3 && registration.crossArtifactIntegrity?.completeReceiptFloor === 57, "unified nonresolved integrity universe mismatch");
  check(errors, registration.providerEventCount === 0
    && registration.firstProviderExecutionAllowed === false
    && registration.providerControls?.providerEventCount === 0
    && registration.providerControls?.firstProviderExecutionAllowed === false
    && registration.executionLifecycle?.firstProviderCallProhibitedByThisDesignArtifact === true, "design artifact must prohibit provider execution");
  check(errors, same(registration.providerControls?.authorizationTemplates, OWNER_AUTHORIZATION_TEMPLATES_V4)
    && Object.values(registration.providerControls?.authorizationTemplates ?? {}).every((template) => template.isCurrentAuthorization === false && template.grantsProviderExecution === false)
    && registration.providerControls?.currentQwenAuthorizationHash === null
    && registration.providerControls?.currentDeepSeekAuthorizationHash === null, "authorization templates must not be treated as current grants");
  check(errors, registration.providerControls?.deepSeekEnvelope?.region === "UNKNOWN_PENDING_ROUTE_PROBE_EVIDENCE"
    && registration.providerControls?.deepSeekEnvelope?.directBillingStatus === "UNKNOWN_PENDING_ROUTE_PROBE_EVIDENCE"
    && registration.providerControls?.deepSeekEnvelope?.dataRegionStatus === "UNKNOWN_PENDING_ROUTE_PROBE_EVIDENCE"
    && registration.providerControls?.deepSeekEnvelope?.fullAuthorizationAllowed === false
    && registration.providerControls?.deepSeekEnvelope?.priceNotHardcoded === true, "DeepSeek route facts must remain unknown and authorization-blocking before probe evidence");
  check(errors, registration.providerControls?.qwenEnvelope?.region === null
    && registration.providerControls?.qwenEnvelope?.endpoint === null
    && registration.providerControls?.qwenEnvelope?.regionDecisionStatus === "OWNER_DECISION_REQUIRED_NOT_FROZEN"
    && registration.providerControls?.qwenEnvelope?.endpointDecisionStatus === "OWNER_DECISION_REQUIRED_NOT_FROZEN"
    && registration.providerControls?.qwenEnvelope?.fullAuthorizationAllowed === false
    && registration.providerControls?.qwenEnvelope?.existingLegacyCandidate?.endpoint === "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
    && registration.providerControls?.qwenEnvelope?.existingLegacyCandidate?.region === "cn-beijing"
    && registration.providerControls?.qwenEnvelope?.existingLegacyCandidate?.ownerApprovedForV4 === false
    && registration.providerControls?.qwenEnvelope?.fullAuthorizationBlockers?.includes("OWNER_APPROVED_QWEN_ENDPOINT_AND_REGION_DECISION"), "Qwen endpoint and region must remain an explicit owner decision");
  const qwenLogicalTemplate = {
    envelopeStage: "LOGICAL_REQUEST_PRE_ADAPTER_V4",
    model: "qwen3.8-max",
    stream: false,
    enable_thinking: true,
    temperature: 0,
    response_format: { type: "json_object" },
    max_tokens: 8192,
    enable_search: false,
    requestedSeed: null,
  };
  const { envelopeStage: _qwenStage, requestedSeed: _qwenSeed, ...qwenWireTemplate } = qwenLogicalTemplate;
  const deepSeekLogicalTemplate = {
    envelopeStage: "LOGICAL_REQUEST_PRE_ADAPTER_V4",
    model: "deepseek-v4-pro",
    stream: false,
    thinking: { type: "enabled" },
    reasoning_effort: "high",
    temperature: 0,
    response_format: { type: "json_object" },
    max_tokens: 8192,
    requestedSeed: null,
  };
  const { envelopeStage: _deepSeekStage, requestedSeed: _deepSeekSeed, ...deepSeekWireTemplate } = deepSeekLogicalTemplate;
  check(errors, same(registration.providerControls?.qwenEnvelope?.requestTemplate, qwenLogicalTemplate)
    && same(registration.providerControls?.qwenEnvelope?.wireRequestTemplate, qwenWireTemplate)
    && same(registration.providerControls?.deepSeekEnvelope?.requestTemplate, deepSeekLogicalTemplate)
    && same(registration.providerControls?.deepSeekEnvelope?.wireRequestTemplate, deepSeekWireTemplate), "provider logical/wire template mismatch");
  const c0RandomAudit = registration.providerControls?.deepSeekEnvelope?.c0PrimeRandomAudit;
  check(errors, same(c0RandomAudit?.digestContract, C0_AUDIT_SELECTION_DIGEST_CONTRACT)
    && same(c0RandomAudit?.algorithmDescriptor, C0_AUDIT_ALGORITHM_DESCRIPTOR)
    && c0RandomAudit?.algorithmDescriptorHash === C0_AUDIT_ALGORITHM_HASH
    && same(c0RandomAudit?.digestGoldenVector, C0_AUDIT_SELECTION_GOLDEN_VECTOR), "C0 audit algorithm descriptor or digest golden vector mismatch");
  check(errors, same(registration.providerControls?.providerRoleContractCatalog, expectedProviderRoleContractCatalog()), "provider role contract mismatch");
  check(errors, registration.providerControls?.authorizationRequiredBindings?.includes("providerRouteDecisionHash"), "provider authorization must bind the later-approved route decision");
  check(errors, same([...registration.interfaces?.schemaTitles ?? []].sort(), EXPECTED_SCHEMA_TITLES), "registration interface title set mismatch");
  check(errors, registration.interfaces?.structuralSchemaValidationAloneSufficient === false, "semantic validation must remain required");
  check(errors, same(registration.freezeChain, ["QWEN_ENDPOINT_AND_DATA_REGION_OWNER_DECISION", "DESIGN_REGISTRATION_V4", "RUNTIME_SOURCE_BINDING", "FRAME_REGISTRATION", "SAMPLE_REGISTRATION", "QWEN_AUTHORIZATION", "QWEN_REFERENCE_ATTEMPT_HISTORY_NONZERO", "REFERENCE_LABEL_SEAL", "DEEPSEEK_ROUTE_PROBE_AUTHORIZATION", "DEEPSEEK_ROUTE_PROBE_RECEIPT", "DEEPSEEK_AUTHORIZATION", "EXECUTION_REGISTRATION"]), "freeze chain mismatch");
  check(errors, plainDagIsAcyclic(registration.freezeAndLaterBindDag)
    && registration.freezeAndLaterBindDag?.noProviderRequestAuthorizedByDesignRegistration === true
    && registration.freezeAndLaterBindDag?.candidateAssembled?.includes("DESIGN_REGISTRATION_V4_CANDIDATE_ASSEMBLED")
    && registration.freezeAndLaterBindDag?.laterBound?.includes("QWEN_ENDPOINT_AND_DATA_REGION_OWNER_DECISION_LATER")
    && registration.freezeAndLaterBindDag?.laterBound?.includes("DESIGN_REGISTRATION_V4_FROZEN_LATER")
    && registration.freezeAndLaterBindDag?.laterBound?.includes("RUNTIME_SOURCE_BINDING_LATER")
    && registration.freezeAndLaterBindDag?.laterBound?.includes("EXECUTION_REGISTRATION_LATER"), "freeze/later-bind DAG mismatch");
  check(errors, registration.preExecutionState?.schemaVersion === "PreExecutionStateV1"
    && registration.preExecutionState?.state === "DESIGN_CANDIDATE_OWNER_DECISIONS_PENDING"
    && registration.preExecutionState?.registrationHash === null
    && registration.preExecutionState?.providerEventCount === 0
    && registration.preExecutionState?.qwenReferenceAttemptCount === 0
    && registration.preExecutionState?.deepSeekRouteProbeAttemptCount === 0
    && registration.preExecutionState?.deepSeekNaturalItemAttemptCount === 0
    && registration.preExecutionState?.naturalQuestionResultCount === 0, "pre-execution zero-event state mismatch");
  check(errors, registration.executionChronology?.deepSeekRouteProbe?.payloadKind === "STATIC_NON_NATURAL_ROUTE_PROBE"
    && registration.executionChronology?.deepSeekRouteProbe?.containsNaturalItemText === false
    && registration.executionChronology?.deepSeekRouteProbe?.countsAgainstDeepSeekCaps?.attempts === true
    && registration.executionChronology?.deepSeekRouteProbe?.countsAgainstDeepSeekCaps?.tokens === true
    && registration.executionChronology?.deepSeekRouteProbe?.countsAgainstDeepSeekCaps?.usd === true
    && same(registration.executionChronology?.deepSeekFullAuthorizationRequires, ["VALID_DEEPSEEK_ROUTE_PROBE_RECEIPT_HASH", "SEALED_REFERENCE_LABEL_HASH", "NONZERO_QWEN_REFERENCE_ATTEMPT_CHAIN_HASH"]), "provider execution chronology mismatch");
  check(errors, same(registration.publicReport?.limitationCodes, FROZEN_PUBLIC_LIMITATIONS_V4)
    && registration.publicReport?.decisionCeiling === DECISION_CEILING_V4
    && registration.publicReport?.claimScopeCeiling === CLAIM_SCOPE_CEILING_V4, "public limitations or claim boundary mismatch");
  check(errors, registration.hashDependencyDag?.cycleFree === true
    && hashDependencyDagIsAcyclic(registration.hashDependencyDag)
    && registration.hashDependencyDag?.status === "PROPOSED_FREEZE_DAG_NOT_ACTIVE"
    && registration.hashDependencyDag?.dagDefinitionHash === null
    && typeof registration.hashDependencyDag?.staleSupersededDagDefinitionHash === "string"
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
  check(errors, power?.bindingStatus === "CANDIDATE_UNBOUND_PENDING_REGISTRATION_FREEZE"
    && power?.designRegistrationHash === null
    && power?.powerArtifactHash === null, "candidate statistical-power evidence must remain unbound and unsealed");
  check(errors, power?.binaryThresholdOpportunity?.requiredTotal === 77 && power?.binaryThresholdOpportunity?.structurallyPossibleWithin60 === false, "77>60 structural proof mismatch");
  check(errors, nearlyEqual(power?.ca60WorstCasePrecision?.halfWidth, wilsonInterval(60, 30, 1.959963984540054).halfWidth), "CA60 Wilson precision mismatch");
  check(errors, power?.zeroMissOpportunity?.[0]?.requiredN === 59 && power?.planningScale?.recommendedIndependentClusters === 400, "P0/future planning evidence mismatch");
}

export async function validateArtifacts({
  registration,
  power,
  schemas = [],
  providerEvents = [],
  predecessorInventory = null,
  productionSourceTexts = {},
  rootArtifacts = [],
  validationMode = "CANDIDATE_DRAFT",
}) {
  const errors = [];
  try {
    check(errors, ["CANDIDATE_DRAFT", "FROZEN_REGISTRATION"].includes(validationMode), "unknown validation mode");
    validateDesignSemantics(registration, validationMode, errors);
    if (validationMode === "FROZEN_REGISTRATION") {
      const computedSectionHashes = calculateFrozenContractHashes(registration);
      check(errors, same(registration.frozenContractHashes, computedSectionHashes), "frozen contract section hash mismatch");
      check(errors, typeof registration.registrationHash === "string"
        && registration.registrationHash === calculateRegistrationHash(registration), "registration self-hash mismatch");
      if (FROZEN_REGISTRATION_HASH !== "TO_BE_FROZEN_AFTER_V4_ASSEMBLY") {
        check(errors, registration.registrationHash === FROZEN_REGISTRATION_HASH, "frozen registration hash mismatch");
      }
    } else {
      check(errors, registration.frozenContractHashes === null && registration.registrationHash === null, "candidate registration roots must remain null");
    }
    validateSchemaContracts(registration, schemas, productionSourceTexts, rootArtifacts, validationMode, errors);
    validatePower(registration, power, errors);
    check(errors, predecessorInventory?.schemaVersion === "PredecessorPackageInventoryV1"
      && predecessorInventory?.fileCount === 45
      && predecessorInventory?.registrationHash === PREDECESSOR_REGISTRATION_HASH
      && predecessorInventory?.registrationByteSha256 === "3299e95244540942ad82f6a616ace4d64be3a74ff1ba78172aeb6a34088f7939"
      && predecessorInventory?.inventoryRootHash === "0aa952f44ee0558b0b5054b04bb669951e63e7c63a74a5a68881e70a3a5da471"
      && predecessorInventory?.inventoryRootHash === sha256Hex(canonicalJson(predecessorInventory.entries)), "V3 predecessor exact inventory artifact mismatch");
    check(errors, Array.isArray(providerEvents), "provider event ledger must be an array");
    if (providerEvents.length > 0) errors.push("provider event exists in the pre-execution design package");
  } catch (error) {
    errors.push(`design package validation failed closed: ${error.message}`);
  }
  return {
    ok: errors.length === 0,
    designId: registration?.designId ?? null,
    registrationHash: registration?.registrationHash ?? null,
    lifecycleStatus: registration?.lifecycleStatus ?? null,
    freezeAllowed: registration?.freezeAllowed ?? null,
    validationMode,
    schemaCount: schemas.length,
    providerEventCount: Array.isArray(providerEvents) ? providerEvents.length : null,
    thresholdFreezePrecedesProviderEvents: Array.isArray(providerEvents) && providerEvents.length === 0,
    decisionCeiling: registration?.scope?.decisionCeiling ?? null,
    claimScopeCeiling: registration?.scope?.claimScopeCeiling ?? null,
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
  const productionSourceTexts = Object.fromEntries(await Promise.all(PRODUCTION_EMITTER_SOURCE_PATHS.map(async (sourcePath) => [
    sourcePath,
    await readFile(path.join(packageDirectory, sourcePath), "utf8"),
  ])));
  const providerEvents = rootJson.filter((artifact) => ["ProviderAttemptReceiptV1", "DeepSeekRouteProbeReceiptV1"].includes(artifact.schemaVersion));
  const predecessorInventory = rootJson.find((artifact) => artifact.schemaVersion === "PredecessorPackageInventoryV1") ?? null;
  return {
    registration,
    power,
    schemas,
    providerEvents,
    predecessorInventory,
    productionSourceTexts,
    rootArtifacts: [registration, power, ...rootJson],
  };
}

async function main() {
  const unknown = process.argv.slice(2).filter((argument) => !["--json", "--require-frozen"].includes(argument));
  if (unknown.length > 0) throw new Error(`Unknown argument(s): ${unknown.join(", ")}`);
  const result = await validateArtifacts({
    ...await loadPackage(),
    validationMode: process.argv.includes("--require-frozen") ? "FROZEN_REGISTRATION" : "CANDIDATE_DRAFT",
  });
  if (process.argv.includes("--json")) process.stdout.write(`${JSON.stringify(result)}\n`);
  else if (result.ok) process.stdout.write(`VALID_CANDIDATE ${result.designId}; lifecycle=${result.lifecycleStatus}; schemas=${result.schemaCount}; providerEvents=${result.providerEventCount}; ceiling=${result.decisionCeiling}\n`);
  else process.stderr.write(`INVALID ${result.designId}\n${result.errors.map((error) => `- ${error}`).join("\n")}\n`);
  if (!result.ok) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
