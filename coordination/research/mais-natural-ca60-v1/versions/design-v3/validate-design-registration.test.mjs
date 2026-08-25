import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  calculateArtifactHash,
  canonicalJson,
  DEEPSEEK_ROLE_CONTRACTS,
  FINDING_WORST_CASE_METHOD,
  INTEGRITY_LIMIT_EXCEEDED_WORST_CASE_METHOD,
  QWEN_ROLE_CONTRACTS,
  providerRequestTemplateHash,
  sha256Hex,
  SURFACE_WORST_CASE_METHOD,
  UNIFIED_NONRESOLVED_UNIVERSE_FORMULA,
} from "./design-contract.mjs";
import {
  buildStatisticalPower,
  calculateFrozenContractHashes,
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
const EXPECTED_V2_HASH = "a1b7d7ac6cf23b059dddc015c75b876d26a3576f9e5e3e07724ef8c5b8429de8";
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

async function loadArtifacts() {
  const registration = JSON.parse(await readFile(new URL("./design-registration.json", packageRoot), "utf8"));
  const power = JSON.parse(await readFile(new URL("./statistical-power.json", packageRoot), "utf8"));
  const names = (await readdir(new URL("./schemas/", packageRoot))).filter((name) => name.endsWith(".schema.json")).sort();
  const schemas = await Promise.all(names.map(async (name) => JSON.parse(await readFile(new URL(`./schemas/${name}`, packageRoot), "utf8"))));
  return { registration, power, schemas, providerEvents: [] };
}

test("V3 freeze timestamp is a real past-or-present event, never a future registration claim", async () => {
  const { registration } = await loadArtifacts();
  assert.match(registration.frozenAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u);
  assert.equal(new Date(Date.parse(registration.frozenAt)).toISOString(), registration.frozenAt);
  assert.equal(Date.parse(registration.frozenAt) <= Date.now(), true);
});

test("V3 package freezes the append-only predecessor, registration root, and all contract section hashes", async () => {
  const artifacts = await loadArtifacts();
  const result = await validateArtifacts(artifacts);
  assert.deepEqual(result.errors, []);
  assert.equal(result.ok, true);
  assert.equal(artifacts.registration.schemaVersion, "NaturalCaPilotDesignRegistrationV3");
  assert.equal(artifacts.registration.designId, "MAIS-NATURAL-CA60-V3");
  assert.equal(artifacts.registration.supersedes.registrationHash, EXPECTED_V2_HASH);
  assert.equal(Date.parse(artifacts.registration.frozenAt) <= Date.now(), true, "design registration cannot be frozen in the future");
  assert.equal(artifacts.registration.registrationHash, calculateRegistrationHash(artifacts.registration));
  assert.deepEqual(artifacts.registration.frozenContractHashes, calculateFrozenContractHashes(artifacts.registration));
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
  assert.equal(dag.dagDefinitionHash, sha256Hex(canonicalJson({ nodes: expectedNodes, edges: expectedEdges })));

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

test("V3 restores FALSE_ACCEPT_CORRECT_RESPONSE as a formal metric-eligible P0 and freezes 17 operational codes", async () => {
  const { registration } = await loadArtifacts();
  assert.equal(registration.taxonomy.severityByCode.FALSE_ACCEPT_CORRECT_RESPONSE, "P0");
  assert.equal(registration.taxonomy.familyByCode.FALSE_ACCEPT_CORRECT_RESPONSE, "RESPONSE_ACCEPTANCE");
  assert.deepEqual(registration.taxonomy.acceptedCodeMapping.FALSE_ACCEPT_CORRECT_RESPONSE, ["FALSE_ACCEPT_CORRECT_RESPONSE"]);
  assert.equal(registration.taxonomy.falseAcceptCorrectResponseMetricCreditAllowed, true);
  assert.equal(registration.taxonomy.defectCodes.length, 17);
  assert.equal(registration.analysis.missingData.finiteOperationalCodeCount, 17);
  assert.equal(registration.analysis.missingData.maximumAdversarialFamilyFindingsPerNonresolvedItem, 17);
  assert.equal(registration.analysis.missingData.maximumAdversarialExactFindingsPerNonresolvedItem, 17);
});

test("integrity contract freezes one unified nonresolved universe of at most three", async () => {
  const { registration } = await loadArtifacts();
  assert.equal(registration.crossArtifactIntegrity.unifiedNonresolvedUniverse.formula, "missingReceiptItemCount + unresolvedReferenceItemCount + invalidItemCount");
  assert.equal(registration.crossArtifactIntegrity.unifiedNonresolvedUniverse.maximum, 3);
  assert.equal(registration.crossArtifactIntegrity.completeReceiptFloor, 57);
  assert.equal(registration.analysis.missingData.maximumUnifiedNonresolvedItems, 3);
  assert.match(JSON.stringify(registration.analysis.denominatorPolicy), /missing.*unresolved.*invalid/iu);
});

test("surface worlds and finite finding additions freeze the exact implemented missing-data methods", async () => {
  const { registration } = await loadArtifacts();
  const missing = registration.analysis.missingData;
  assert.equal(missing.unifiedNonresolvedUniverseFormula, UNIFIED_NONRESOLVED_UNIVERSE_FORMULA);
  assert.equal(missing.surfaceWorldEnumerationMethod, SURFACE_WORST_CASE_METHOD);
  assert.equal(missing.findingWorstCaseMethod, FINDING_WORST_CASE_METHOD);
  assert.equal(missing.integrityLimitExceededMetricMethod, INTEGRITY_LIMIT_EXCEEDED_WORST_CASE_METHOD);
  assert.deepEqual(missing.integrityLimitExceededMetricBounds, { lower: 0, upper: 1 });
  assert.match(missing.itemMetricRule, /2\^r \* 4\^m.*maximum 64/u);
  assert.match(missing.findingMetricRule, /monotone worst case equals maximumPerItem\*u/u);
  assert.deepEqual(missing.maximumAtThreeMissingItems, {
    FAMILY_RECALL: 51,
    EXACT_RECALL: 51,
    P1_RECALL: 21,
    P2_MISSED_OR_UNRESOLVED: 12,
  });
});

test("all V3 public interfaces have strict local schemas and semantic validators", async () => {
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

test("design root freezes the canonical content hash of every registered JSON Schema", async () => {
  const { registration, schemas } = await loadArtifacts();
  const expectedSchemaHashes = Object.fromEntries(schemas
    .map((schema) => [schema.title, sha256Hex(canonicalJson(schema))])
    .sort(([left], [right]) => left.localeCompare(right)));
  assert.deepEqual(registration.interfaces.canonicalSchemaHashes, expectedSchemaHashes);
  assert.equal(registration.interfaces.schemaSetHash, sha256Hex(canonicalJson(expectedSchemaHashes)));
  assert.equal(registration.interfaces.schemaCanonicalization, "RFC8785_JCS_SHA256");
});

test("schema content substitution fails validation even when its title and registration roots are unchanged", async () => {
  const artifacts = await loadArtifacts();
  artifacts.schemas.find(({ title }) => title === "MachineReferenceLabelV1").description = "substituted";
  const result = await validateArtifacts(artifacts);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /canonical schema hash catalog mismatch/u);
});

test("design root freezes every provider role prompt literal, schema, input allowlist, and request-template hash", async () => {
  const { registration } = await loadArtifacts();
  const expectedRoleContracts = (contracts) => Object.fromEntries(Object.entries(contracts).map(([role, contract]) => [role, {
    inputFieldNames: [...contract.inputFieldNames],
    promptLiteral: contract.promptLiteral,
    promptHash: contract.promptHash,
    schemaLiteral: contract.schemaLiteral,
    schemaHash: contract.schemaHash,
  }]));
  assert.deepEqual(registration.providerControls.frozenRoleContracts.qwen, expectedRoleContracts(QWEN_ROLE_CONTRACTS));
  assert.deepEqual(registration.providerControls.frozenRoleContracts.deepSeek, expectedRoleContracts(DEEPSEEK_ROLE_CONTRACTS));
  assert.equal(registration.providerControls.frozenRoleContracts.qwenRequestTemplateHash, providerRequestTemplateHash("ALIBABA_CLOUD_MODEL_STUDIO"));
  assert.equal(registration.providerControls.frozenRoleContracts.deepSeekRequestTemplateHash, providerRequestTemplateHash("DEEPSEEK_DIRECT"));
  assert.notEqual(registration.providerControls.frozenRoleContracts.qwen.A_SOLVE.promptHash, registration.providerControls.frozenRoleContracts.qwen.B_SOLVE.promptHash);
});

test("semantic registration validation rejects a substituted provider prompt even with recomputed roots", async () => {
  const artifacts = await loadArtifacts();
  artifacts.registration.providerControls.frozenRoleContracts.qwen.A_SOLVE.promptLiteral += " substituted";
  artifacts.registration.frozenContractHashes = calculateFrozenContractHashes(artifacts.registration);
  artifacts.registration.registrationHash = calculateRegistrationHash(artifacts.registration);
  const result = await validateArtifacts(artifacts);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /provider role contract mismatch/u);
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
  assert.equal(power.powerArtifactHash, calculateArtifactHash(power, "powerArtifactHash"));
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

test("zero-network CLI validates only frozen local artifacts", () => {
  const script = new URL("./validate-design-registration.mjs", import.meta.url);
  const source = spawnSync(process.execPath, [script.pathname, "--json"], { encoding: "utf8" });
  assert.equal(source.status, 0, source.stderr);
  const report = JSON.parse(source.stdout);
  assert.equal(report.ok, true);
  assert.equal(report.schemaCount, EXPECTED_SCHEMA_TITLES.length);
  assert.equal(report.providerEventCount, 0);
  const implementation = spawnSync(process.execPath, ["-e", `process.stdout.write(require('fs').readFileSync(${JSON.stringify(script.pathname)}, 'utf8'))`], { encoding: "utf8" }).stdout;
  assert.doesNotMatch(implementation, /\bfetch\s*\(|node:https|node:http|undici|axios/u);
});
