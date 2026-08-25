import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  calculateArtifactHash,
  canonicalJson,
  FINDING_UNIDENTIFIED_METHOD,
  FROZEN_METHOD_COMPONENT_ROOTS_V4,
  FROZEN_METHOD_COMPONENT_ROOTS_V4_HASH,
  FINDING_WORST_CASE_METHOD,
  INTEGRITY_LIMIT_EXCEEDED_WORST_CASE_METHOD,
  PROVIDER_FIELD_PRESENCE_CONTRACT_V4,
  SAMPLE_ITEM_PSEUDONYM_FORMULA_V4,
  providerRequestTemplateHash,
  sha256Hex,
  SURFACE_COUNTERFACTUAL_ENUMERATION_RULE,
  SURFACE_WORST_CASE_METHOD,
  UNIFIED_NONRESOLVED_UNIVERSE_FORMULA,
} from "./design-contract.mjs";
import {
  buildStatisticalPower,
  calculateFrozenContractHashes,
  calculateProviderProjectionContract,
  calculateRegistrationHash,
  validateArtifacts,
  wilsonInterval,
  zeroMissRequiredN,
} from "./validate-design-registration.mjs";
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
  SAMPLE_SELECTION_GOLDEN_VECTOR_DESIGN_HASH,
  SAMPLE_SELECTION_GOLDEN_VECTOR_DESIGN_HASH_SEMANTIC,
  SAMPLE_SELECTION_GOLDEN_VECTOR,
} from "./sample-contract.mjs";

const packageRoot = new URL("./", import.meta.url);
const EXPECTED_V3_HASH = "08e89a4d0c6736b48c1dde0048d8f620c35fc486e1d1feaf272e30a1aae4973d";
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

async function loadArtifacts() {
  const registration = JSON.parse(await readFile(new URL("./design-registration.json", packageRoot), "utf8"));
  const power = JSON.parse(await readFile(new URL("./statistical-power.json", packageRoot), "utf8"));
  const predecessorInventory = JSON.parse(await readFile(new URL("./predecessor-package-inventory-v3.json", packageRoot), "utf8"));
  const names = (await readdir(new URL("./schemas/", packageRoot))).filter((name) => name.endsWith(".schema.json")).sort();
  const schemas = await Promise.all(names.map(async (name) => JSON.parse(await readFile(new URL(`./schemas/${name}`, packageRoot), "utf8"))));
  const productionSourcePaths = ["design-contract.mjs", "sample-contract.mjs", "review-gate.mjs"];
  const productionSourceTexts = Object.fromEntries(await Promise.all(productionSourcePaths.map(async (sourcePath) => [
    sourcePath,
    await readFile(new URL(`./${sourcePath}`, packageRoot), "utf8"),
  ])));
  return {
    registration,
    power,
    schemas,
    providerEvents: [],
    predecessorInventory,
    productionSourceTexts,
    rootArtifacts: [registration, power, predecessorInventory],
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

test("V4 is an honest owner-decision-blocked candidate with no active freeze timestamp or registration roots", async () => {
  const { registration } = await loadArtifacts();
  assert.equal(registration.designKind, "PRE_EXECUTION_DESIGN_REGISTRATION_CANDIDATE");
  assert.equal(registration.lifecycleStatus, "DRAFT_OWNER_DECISIONS_PENDING");
  assert.equal(registration.freezeAllowed, false);
  assert.equal(registration.blockingDecisionCodes.includes("QWEN_ENDPOINT_AND_DATA_REGION_OWNER_DECISION_PENDING"), true);
  assert.equal(registration.frozenAt, null);
  assert.equal(registration.registrationHash, null);
  assert.equal(registration.frozenContractHashes, null);
  assert.equal(registration.interfaces.canonicalSchemaHashes, null);
  assert.equal(registration.interfaces.schemaSetHash, null);
  assert.match(registration.candidateAssembledAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u);
  assert.equal(Date.parse(registration.candidateAssembledAt) <= Date.now(), true);
});

test("candidate validation succeeds while frozen validation fails closed until owner decisions and sealing", async () => {
  const artifacts = await loadArtifacts();
  const result = await validateArtifacts({ ...artifacts, validationMode: "CANDIDATE_DRAFT" });
  assert.deepEqual(result.errors, []);
  assert.equal(result.ok, true);
  assert.equal(result.lifecycleStatus, "DRAFT_OWNER_DECISIONS_PENDING");
  assert.equal(result.freezeAllowed, false);
  const frozenResult = await validateArtifacts({ ...artifacts, validationMode: "FROZEN_REGISTRATION" });
  assert.equal(frozenResult.ok, false);
  assert.match(frozenResult.errors.join("\n"), /QWEN_ENDPOINT_AND_DATA_REGION_OWNER_DECISION_PENDING|frozen registration required/u);
  assert.equal(artifacts.registration.schemaVersion, "NaturalCaPilotDesignRegistrationV4");
  assert.equal(artifacts.registration.designId, "MAIS-NATURAL-CA60-V4");
  assert.equal(artifacts.registration.version, 4);
  assert.equal(artifacts.registration.proposedSupersedes.registrationHash, EXPECTED_V3_HASH);
  assert.equal(artifacts.registration.proposedSupersedes.currentDisposition, "ACTIVE_DESIGN_REGISTRATION_V3_NO_PROVIDER_EXECUTION");
  assert.equal(artifacts.registration.proposedSupersedesRegistrationHash, EXPECTED_V3_HASH);
  assert.equal(artifacts.registration.proposedSupersedesDispositionAfterValidFreeze, "SUPERSEDED_NOT_EXECUTED");
  assert.equal(artifacts.registration.providerEventCount, 0);
  assert.equal(artifacts.registration.firstProviderExecutionAllowed, false);
  assert.equal(artifacts.registration.frozenAt, null);
  assert.equal(artifacts.registration.registrationHash, null);
  assert.equal(artifacts.registration.frozenContractHashes, null);
  assert.equal(artifacts.registration.hashDependencyDag.cycleFree, true);
  assert.equal(artifacts.registration.hashDependencyDag.naturalSchemaDerivedHashFieldsStructuralOnly, true);
  assert.equal(artifacts.registration.hashDependencyDag.naturalSchemaExcludesRegistrationSectionCatalogSetAndSelfHashLiterals, true);
  assert.equal(artifacts.registration.hashDependencyDag.registrationExcludesExternalStatisticalPowerArtifactHash, true);
  assert.equal(artifacts.registration.hashDependencyDag.edges.includes("STATISTICAL_POWER_ARTIFACT->DESIGN_REGISTRATION_HASH"), false);
  assert.equal(artifacts.registration.hashDependencyDag.edges.includes("DESIGN_REGISTRATION_HASH->JSON_SCHEMA_BYTES_WITH_DERIVED_HASH_FIELDS_STRUCTURAL_ONLY"), false);
  assert.equal(artifacts.registration.hashDependencyDag.edges.includes("CANONICAL_SCHEMA_HASHES_AND_SCHEMA_SET_HASH->JSON_SCHEMA_BYTES_WITH_DERIVED_HASH_FIELDS_STRUCTURAL_ONLY"), false);
  assert.equal(artifacts.registration.hashDependencyDag.activePointerIsMutableAndNotAFrozenRegistration, true);
  assert.equal(result.providerEventCount, 0);
});

test("candidate validation independently enforces the publication custody blocker without treating it as a design-freeze blocker", async () => {
  const artifacts = await loadArtifacts();
  assert.deepEqual(artifacts.registration.blockingDecisionCodes, [
    "QWEN_ENDPOINT_AND_DATA_REGION_OWNER_DECISION_PENDING",
  ]);
  for (const mutate of [
    (registration) => { registration.publicationAuthorizationStatus = "AUTHORIZED"; },
    (registration) => { registration.publicationAuthorizationBlockers = []; },
    (registration) => { registration.executionLifecycle.publicationAuthorizationAvailable = true; },
    (registration) => { registration.interfaces.publicationAuthorizationContract.callerSuppliedCustodyRootsAuthorized = true; },
    (registration) => { registration.interfaces.publicationAuthorizationContract.protectedRegistryRootHash = "a".repeat(64); },
    (registration) => { registration.publicReport.aggregateExportAuthorized = true; },
  ]) {
    const attacked = structuredClone(artifacts.registration);
    mutate(attacked);
    const result = await validateArtifacts({
      ...artifacts,
      registration: attacked,
      rootArtifacts: [attacked, artifacts.power, artifacts.predecessorInventory],
      validationMode: "CANDIDATE_DRAFT",
    });
    assert.match(result.errors.join("\n"), /publication authorization custody contract mismatch/u);
  }
});

test("hash dependency graph has one golden definition hash and is mechanically acyclic", async () => {
  const { registration } = await loadArtifacts();
  const dag = registration.hashDependencyDag;
  const expectedNodes = [
    "STATIC_DESIGN_CONTRACT_LITERALS",
    "JSON_SCHEMA_BYTES_WITH_DERIVED_HASH_FIELDS_STRUCTURAL_ONLY",
    "CANONICAL_SCHEMA_HASHES_AND_SCHEMA_SET_HASH",
    "FROZEN_CONTRACT_SECTION_HASHES",
    "DESIGN_REGISTRATION_HASH",
    "STATISTICAL_POWER_ARTIFACT",
    "ACTIVE_DESIGN_POINTER_MUTABLE_NON_REGISTRATION",
  ];
  const expectedEdges = [
    "STATIC_DESIGN_CONTRACT_LITERALS->JSON_SCHEMA_BYTES_WITH_DERIVED_HASH_FIELDS_STRUCTURAL_ONLY",
    "JSON_SCHEMA_BYTES_WITH_DERIVED_HASH_FIELDS_STRUCTURAL_ONLY->CANONICAL_SCHEMA_HASHES_AND_SCHEMA_SET_HASH",
    "STATIC_DESIGN_CONTRACT_LITERALS->FROZEN_CONTRACT_SECTION_HASHES",
    "CANONICAL_SCHEMA_HASHES_AND_SCHEMA_SET_HASH->FROZEN_CONTRACT_SECTION_HASHES",
    "STATIC_DESIGN_CONTRACT_LITERALS->DESIGN_REGISTRATION_HASH",
    "FROZEN_CONTRACT_SECTION_HASHES->DESIGN_REGISTRATION_HASH",
    "DESIGN_REGISTRATION_HASH->STATISTICAL_POWER_ARTIFACT",
    "DESIGN_REGISTRATION_HASH->ACTIVE_DESIGN_POINTER_MUTABLE_NON_REGISTRATION",
  ];
  assert.deepEqual(dag.nodes, expectedNodes);
  assert.deepEqual(dag.edges, expectedEdges);
  assert.equal(dag.status, "PROPOSED_FREEZE_DAG_NOT_ACTIVE");
  assert.equal(dag.dagDefinitionHash, null);
  assert.equal(dag.staleSupersededDagDefinitionHash, sha256Hex(canonicalJson({ nodes: expectedNodes, edges: expectedEdges })));

  const indegree = new Map(expectedNodes.map((node) => [node, 0]));
  const adjacency = new Map(expectedNodes.map((node) => [node, []]));
  for (const edge of expectedEdges) {
    const [from, to, ...extra] = edge.split("->");
    assert.equal(extra.length, 0, edge);
    assert.equal(indegree.has(from) && indegree.has(to), true, edge);
    adjacency.get(from).push(to);
    indegree.set(to, indegree.get(to) + 1);
  }
  const queue = expectedNodes.filter((node) => indegree.get(node) === 0);
  let visited = 0;
  while (queue.length > 0) {
    const node = queue.shift();
    visited += 1;
    for (const next of adjacency.get(node)) {
      indegree.set(next, indegree.get(next) - 1);
      if (indegree.get(next) === 0) queue.push(next);
    }
  }
  assert.equal(visited, expectedNodes.length, "hash dependency graph must remain acyclic");
});

test("semantic validator rejects a reverse hash edge even when all attacker-controlled hashes are recomputed", async () => {
  const artifacts = await loadArtifacts();
  artifacts.registration.hashDependencyDag.edges.push("STATISTICAL_POWER_ARTIFACT->DESIGN_REGISTRATION_HASH");
  artifacts.registration.hashDependencyDag.dagDefinitionHash = sha256Hex(canonicalJson({
    nodes: artifacts.registration.hashDependencyDag.nodes,
    edges: artifacts.registration.hashDependencyDag.edges,
  }));
  artifacts.registration.frozenContractHashes = calculateFrozenContractHashes(artifacts.registration);
  artifacts.registration.registrationHash = calculateRegistrationHash(artifacts.registration);
  const result = await validateArtifacts(artifacts);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /hash dependency DAG is cyclic or reverse-binds/u);
});

test("mutating a frozen section fails even if the attacker recomputes the self-hash", async () => {
  const artifacts = await loadArtifacts();
  artifacts.registration.analysis.thresholds.surfaceSensitivityOneSidedWilsonLcb95AtLeast = 0.89;
  artifacts.registration.frozenContractHashes = calculateFrozenContractHashes(artifacts.registration);
  artifacts.registration.registrationHash = calculateRegistrationHash(artifacts.registration);
  const result = await validateArtifacts(artifacts);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /frozen registration hash|sensitivity threshold/u);
});

test("V4 preserves FALSE_ACCEPT_CORRECT_RESPONSE as a formal metric-eligible P0 without fabricating finite finding caps", async () => {
  const { registration } = await loadArtifacts();
  assert.equal(registration.taxonomy.severityByCode.FALSE_ACCEPT_CORRECT_RESPONSE, "P0");
  assert.equal(registration.taxonomy.familyByCode.FALSE_ACCEPT_CORRECT_RESPONSE, "RESPONSE_ACCEPTANCE");
  assert.deepEqual(registration.taxonomy.acceptedCodeMapping.FALSE_ACCEPT_CORRECT_RESPONSE, ["FALSE_ACCEPT_CORRECT_RESPONSE"]);
  assert.equal(registration.taxonomy.falseAcceptCorrectResponseMetricCreditAllowed, true);
  assert.equal(registration.taxonomy.defectCodes.length, 17);
  for (const field of [
    "finiteOperationalCodeCount",
    "operationalMetricCodes",
    "perMissingItemMaximumUnmatchedOpportunities",
    "maximumAdversarialFamilyFindingsPerNonresolvedItem",
    "maximumAdversarialExactFindingsPerNonresolvedItem",
    "maximumAdversarialP1FindingsPerNonresolvedItem",
    "maximumAdversarialP2FindingsPerNonresolvedItem",
    "maximumAtThreeMissingItems",
  ]) assert.equal(Object.hasOwn(registration.analysis.missingData, field), false, field);
});

test("integrity contract freezes one unified nonresolved universe of at most three", async () => {
  const { registration } = await loadArtifacts();
  assert.equal(registration.crossArtifactIntegrity.unifiedNonresolvedUniverse.formula, "missingReceiptItemCount + unresolvedReferenceItemCount + invalidItemCount");
  assert.equal(registration.crossArtifactIntegrity.unifiedNonresolvedUniverse.maximum, 3);
  assert.equal(registration.crossArtifactIntegrity.completeReceiptFloor, 57);
  assert.equal(registration.analysis.missingData.maximumUnifiedNonresolvedItems, 3);
  assert.match(JSON.stringify(registration.analysis.denominatorPolicy), /missing.*unresolved.*invalid/iu);
});

test("surface worlds and unidentified finding bounds freeze the exact implemented missing-data methods", async () => {
  const { registration } = await loadArtifacts();
  const missing = registration.analysis.missingData;
  assert.equal(missing.unifiedNonresolvedUniverseFormula, UNIFIED_NONRESOLVED_UNIVERSE_FORMULA);
  assert.equal(missing.surfaceCounterfactualEnumerationRule, SURFACE_COUNTERFACTUAL_ENUMERATION_RULE);
  assert.equal(missing.surfaceWorldEnumerationMethod, SURFACE_WORST_CASE_METHOD);
  assert.equal(missing.surfaceWorldMaximumAtUnifiedNonresolvedLimit, 64);
  assert.equal(missing.findingWorstCaseMethod, FINDING_WORST_CASE_METHOD);
  assert.equal(missing.findingUnidentifiedMethod, FINDING_UNIDENTIFIED_METHOD);
  assert.deepEqual(missing.unidentifiedFindingDecisionBound, { lower: 0, upper: 1 });
  assert.equal(missing.unidentifiedFindingMetricStatus, "UNDERPOWERED");
  assert.equal(missing.integrityLimitExceededMetricMethod, INTEGRITY_LIMIT_EXCEEDED_WORST_CASE_METHOD);
  assert.deepEqual(missing.integrityLimitExceededMetricBounds, { lower: 0, upper: 1 });
  assert.match(missing.itemMetricRule, /PRODUCT\(per-item cardinality\).*maximum 64/iu);
  assert.match(missing.findingMetricRule, /unidentified.*\[0,1\].*UNDERPOWERED/iu);
});

test("V4 registration binds the independently testable method component roots", async () => {
  const { registration } = await loadArtifacts();
  assert.deepEqual(registration.analysis.frozenMethodComponentRoots, FROZEN_METHOD_COMPONENT_ROOTS_V4);
  assert.equal(registration.analysis.frozenMethodComponentRootsHash, FROZEN_METHOD_COMPONENT_ROOTS_V4_HASH);
  assert.equal(registration.analysis.frozenMethodComponentRootCanonicalization, "RFC8785_JCS_SHA256");
});

test("all V4 persisted interfaces have strict local schemas and semantic validators", async () => {
  const { registration, schemas } = await loadArtifacts();
  assert.deepEqual(schemas.map((schema) => schema.title).sort(), EXPECTED_SCHEMA_TITLES);
  assert.deepEqual([...registration.interfaces.schemaTitles].sort(), EXPECTED_SCHEMA_TITLES);
  assert.equal(registration.interfaces.structuralSchemaValidationAloneSufficient, false);
  for (const schema of schemas) {
    assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema", schema.title);
    assert.equal(schema.$id, `https://mais.hk/schemas/research/${schema.title}.schema.json`, schema.title);
    assert.equal(schema.type, "object", schema.title);
    assert.equal(schema.additionalProperties, false, schema.title);
    assert.equal(schema.properties.schemaVersion.const, schema.title);
    assert.ok(schema.required.includes("schemaVersion"), schema.title);
  }
  const auth = schemas.find((schema) => schema.title === "ProviderAuthorizationV1");
  const attempt = schemas.find((schema) => schema.title === "ProviderAttemptReceiptV1");
  const final = schemas.find((schema) => schema.title === "FinalEvaluationReceiptV1");
  const review = schemas.find((schema) => schema.title === "IndependentReviewReceiptV1");
  assert.ok(Array.isArray(auth.allOf) && auth.allOf.length >= 2, "authorization provider conditionals required");
  assert.ok(Array.isArray(attempt.allOf) && attempt.allOf.length >= 2, "attempt status/provider conditionals required");
  assert.ok(final.required.includes("unifiedNonresolvedItemCount"));
  assert.ok(review.allOf.some((entry) => entry.if?.properties?.reviewStatus?.const === "CONCURRED"));
});

test("candidate keeps schema catalog roots unsealed until the owner decision", async () => {
  const { registration } = await loadArtifacts();
  assert.equal(registration.interfaces.canonicalSchemaHashes, null);
  assert.equal(registration.interfaces.schemaSetHash, null);
  assert.match(registration.interfaces.staleSupersededDraftEvidence.disposition, /NON_AUTHORITATIVE/u);
  assert.equal(registration.interfaces.schemaCanonicalization, "RFC8785_JCS_SHA256");
});

test("schema identity substitution fails candidate validation without relying on an active schema root", async () => {
  const artifacts = await loadArtifacts();
  artifacts.schemas.find(({ title }) => title === "MachineReferenceLabelV1").properties.schemaVersion.const = "SubstitutedV99";
  const result = await validateArtifacts(artifacts);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /schemaVersion contract mismatch|mapped schema node identity mismatch/u);
});

test("candidate binds every provider role allowlist and prompt/schema hashes to implementation-derived roots", async () => {
  const { registration } = await loadArtifacts();
  const expectedProjection = calculateProviderProjectionContract();
  assert.deepEqual(registration.providerControls.providerRoleContractCatalog, expectedProviderRoleContractCatalog());
  assert.equal(expectedProjection.roots.fieldPresenceContract, PROVIDER_FIELD_PRESENCE_CONTRACT_V4);
  assert.equal(expectedProjection.roots.sampleItemPseudonymFormula, SAMPLE_ITEM_PSEUDONYM_FORMULA_V4);
  assert.notEqual(registration.providerControls.providerRoleContractCatalog.qwen.A_SOLVE.promptHash, registration.providerControls.providerRoleContractCatalog.qwen.B_SOLVE.promptHash);
});

test("candidate validation rejects a substituted provider prompt hash", async () => {
  const artifacts = await loadArtifacts();
  artifacts.registration.providerControls.providerRoleContractCatalog.qwen.A_SOLVE.promptHash = "0".repeat(64);
  const result = await validateArtifacts(artifacts);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /provider role contract mismatch/u);
});

test("semantic registration validation independently recomputes provider projection roots", async () => {
  for (const mutate of [
    (registration) => { registration.providerControls.providerRoleContractCatalog.qwen.A_SOLVE.roleContractHash = "0".repeat(64); },
    (registration) => { registration.providerControls.providerRoleContractCatalog.fieldPresenceContractHash = "1".repeat(64); },
    (registration) => { registration.providerControls.providerRoleContractCatalog.sampleItemPseudonymFormulaHash = "2".repeat(64); },
    (registration) => { registration.providerControls.providerRoleContractCatalog.providerProjectionContractRootSetHash = "3".repeat(64); },
  ]) {
    const artifacts = await loadArtifacts();
    mutate(artifacts.registration);
    const result = await validateArtifacts(artifacts);
    assert.equal(result.ok, false);
    assert.match(result.errors.join("\n"), /provider (?:role|projection) contract/u);
  }
});

test("Qwen route remains owner-decision pending and cannot be inferred from the legacy candidate", async () => {
  const { registration } = await loadArtifacts();
  const qwen = registration.providerControls.qwenEnvelope;
  assert.equal(qwen.endpoint, null);
  assert.equal(qwen.region, null);
  assert.equal(qwen.endpointDecisionStatus, "OWNER_DECISION_REQUIRED_NOT_FROZEN");
  assert.equal(qwen.regionDecisionStatus, "OWNER_DECISION_REQUIRED_NOT_FROZEN");
  assert.equal(qwen.fullAuthorizationAllowed, false);
  assert.equal(qwen.existingLegacyCandidate.ownerApprovedForV4, false);
  assert.equal(registration.providerControls.authorizationRequiredBindings.includes("providerRouteDecisionHash"), true);
});

test("registration freezes the exact sample and C0 implementation descriptors and digest golden vectors", async () => {
  const { registration } = await loadArtifacts();
  assert.deepEqual(registration.deterministicSelection.digestContract, SAMPLE_SELECTION_DIGEST_CONTRACT);
  assert.deepEqual(registration.deterministicSelection.algorithmDescriptor, SAMPLE_ALGORITHM_DESCRIPTOR);
  assert.equal(registration.deterministicSelection.algorithmDescriptorHash, SAMPLE_ALGORITHM_HASH);
  assert.deepEqual(registration.deterministicSelection.digestGoldenVector, SAMPLE_SELECTION_GOLDEN_VECTOR);
  assert.equal(registration.deterministicSelection.digestGoldenVector.input.designHash, SAMPLE_SELECTION_GOLDEN_VECTOR_DESIGN_HASH);
  assert.equal(SAMPLE_SELECTION_GOLDEN_VECTOR_DESIGN_HASH, sha256Hex(canonicalJson(SAMPLE_SELECTION_GOLDEN_VECTOR_DESIGN_HASH_SEMANTIC)));
  assert.notEqual(SAMPLE_SELECTION_GOLDEN_VECTOR_DESIGN_HASH, "0".repeat(64));
  const c0 = registration.providerControls.deepSeekEnvelope.c0PrimeRandomAudit;
  assert.deepEqual(c0.digestContract, C0_AUDIT_SELECTION_DIGEST_CONTRACT);
  assert.deepEqual(c0.algorithmDescriptor, C0_AUDIT_ALGORITHM_DESCRIPTOR);
  assert.equal(c0.algorithmDescriptorHash, C0_AUDIT_ALGORITHM_HASH);
  assert.deepEqual(c0.digestGoldenVector, C0_AUDIT_SELECTION_GOLDEN_VECTOR);
});

test("registration freezes the external runtime source-enumeration evidence contract without self-proving completeness", async () => {
  const { registration } = await loadArtifacts();
  assert.deepEqual(registration.runtimePopulation.sourceEnumerationEvidenceContract, RUNTIME_SOURCE_ENUMERATION_EVIDENCE_CONTRACT);
  assert.equal(registration.runtimePopulation.sourceEnumerationEvidenceContractHash, RUNTIME_SOURCE_ENUMERATION_EVIDENCE_CONTRACT_HASH);
  assert.equal(registration.runtimePopulation.sourceEnumerationEvidenceContract.designDoesNotSelfProveSourceCompleteness, true);
  assert.equal(registration.runtimePopulation.sourceEnumerationEvidenceContract.requiresIndependentA11ExtractorRerun, true);
  assert.equal(registration.runtimePopulation.publicProtectedFrameSeparation.publicFrameRegistrationSelfProvesCompleteness, false);
  assert.equal(registration.runtimePopulation.publicProtectedFrameSeparation.validatorRequiresProtectedSnapshotAndCleanSourceEvidence, true);
  assert.equal(registration.independentReview.a11RequiredProcessEvidence.includes("recomputedRuntimeSourceEnumerationRootHash"), true);
  assert.equal(registration.independentReview.a11RequiredProcessEvidence.includes("independentSourceEnumerationReceiptHash"), true);
});

test("statistical-power evidence is deterministic and preserves the CA60 impossibility result", async () => {
  const { registration, power } = await loadArtifacts();
  assert.deepEqual(power, buildStatisticalPower(registration.registrationHash));
  assert.equal(power.binaryThresholdOpportunity.minimumAllSuccessPositiveN, 25);
  assert.equal(power.binaryThresholdOpportunity.minimumAllSuccessNegativeN, 52);
  assert.equal(power.binaryThresholdOpportunity.requiredTotal, 77);
  assert.equal(power.binaryThresholdOpportunity.structurallyPossibleWithin60, false);
  const interval = wilsonInterval(60, 30, 1.959963984540054);
  assert.ok(Math.abs(interval.lower - 0.3773502424155577) < 1e-12);
  assert.ok(Math.abs(interval.upper - 0.6226497575844423) < 1e-12);
  assert.equal(zeroMissRequiredN(0.05), 59);
  assert.equal(power.planningScale.recommendedIndependentClusters, 400);
  assert.equal(power.designRegistrationHash, registration.registrationHash);
  assert.equal(power.bindingStatus, "CANDIDATE_UNBOUND_PENDING_REGISTRATION_FREEZE");
  assert.equal(power.designRegistrationHash, null);
  assert.equal(power.powerArtifactHash, null);
});

test("any provider event keeps this design-only package invalid for execution", async () => {
  const artifacts = await loadArtifacts();
  artifacts.providerEvents.push({
    schemaVersion: "ProviderAttemptReceiptV1",
    registrationHash: artifacts.registration.registrationHash,
    startedAt: "2026-08-25T09:00:00.000Z",
    receiptHash: "1".repeat(64),
  });
  const result = await validateArtifacts(artifacts);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /provider event/i);
});

test("an unknown production-emitted schemaVersion fails closed before it can become an unmapped persisted artifact", async () => {
  const artifacts = await loadArtifacts();
  artifacts.productionSourceTexts["design-contract.mjs"] += "\nconst injected = { schemaVersion: \"UnknownArtifactV99\" };\n";
  const result = await validateArtifacts(artifacts);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /production schemaVersion literal inventory mismatch/u);
  assert.match(result.errors.join("\n"), /UnknownArtifactV99: persisted artifact schema mapping missing/u);
});

test("provider logical or wire template drift fails semantic registration validation", async () => {
  const artifacts = await loadArtifacts();
  artifacts.registration.providerControls.deepSeekEnvelope.wireRequestTemplate.thinking = "enabled";
  artifacts.registration.frozenContractHashes = calculateFrozenContractHashes(artifacts.registration);
  artifacts.registration.registrationHash = calculateRegistrationHash(artifacts.registration);
  const result = await validateArtifacts(artifacts);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /provider logical\/wire template mismatch/u);
});

test("zero-network CLI validates the candidate and fail-closes when a frozen registration is required", () => {
  const script = new URL("./validate-design-registration.mjs", import.meta.url);
  const source = spawnSync(process.execPath, [script.pathname, "--json"], { encoding: "utf8" });
  assert.equal(source.status, 0, source.stderr);
  const report = JSON.parse(source.stdout);
  assert.equal(report.ok, true);
  assert.equal(report.lifecycleStatus, "DRAFT_OWNER_DECISIONS_PENDING");
  assert.equal(report.schemaCount, EXPECTED_SCHEMA_TITLES.length);
  assert.equal(report.providerEventCount, 0);
  const frozen = spawnSync(process.execPath, [script.pathname, "--json", "--require-frozen"], { encoding: "utf8" });
  assert.equal(frozen.status, 1);
  const frozenReport = JSON.parse(frozen.stdout);
  assert.equal(frozenReport.ok, false);
  assert.match(frozenReport.errors.join("\n"), /frozen registration required/u);
  const implementation = spawnSync(process.execPath, ["-e", `process.stdout.write(require('fs').readFileSync(${JSON.stringify(script.pathname)}, 'utf8'))`], { encoding: "utf8" }).stdout;
  assert.doesNotMatch(implementation, /\bfetch\s*\(|node:https|node:http|undici|axios/u);
});
