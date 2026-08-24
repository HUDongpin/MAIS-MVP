import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const expected = [
  "FinalEvaluationReceiptV1",
  "IndependentReviewReceiptV1",
  "ItemEvaluationResultV1",
  "MachineReferenceLabelV1",
  "NaturalCaPilotDesignRegistrationV2",
  "ProviderAttemptReceiptV1",
  "ProviderAuthorizationV1",
  "SampleManifestV1",
  "SamplingFrameRowV1",
];
const expectedRequired = {
  NaturalCaPilotDesignRegistrationV2: ["schemaVersion", "designId", "designKind", "version", "frozenAt", "baselineCommitSha", "supersedes", "provenance", "scope", "runtimePopulation", "eligibility", "stratification", "homologyClustering", "deterministicSelection", "machineReferenceWorkflow", "taxonomy", "labeling", "analysis", "runtimeAccommodation", "providerControls", "executionLifecycle", "interfaces", "artifactStorage", "artifactKinds", "freezeChain", "registrationHash"],
  SamplingFrameRowV1: ["schemaVersion", "designId", "registrationHash", "frameFrozenAt", "itemId", "itemHash", "sourceCommit", "runtimeConfigHash", "region", "curriculumProfile", "grade", "canonicalTopic", "responseForm", "difficulty", "sourceModuleHash", "exactDuplicateGroupId", "homologyClusterId", "sourceClusterId", "eligible", "exclusionCode", "inclusionProbability", "analysisWeight", "runtimeOrigin", "runtimeVisible", "egressEligibility", "answerPresent", "optionsPresent", "explanationPresent", "normalizedPromptHash", "templateSkeletonHash", "lineageKind", "lineageKeyHash", "packageId", "batchId", "sourceModule", "assignedClusterStratum", "clusterRepresentative", "provenanceType", "rowHash"],
  SampleManifestV1: ["schemaVersion", "designId", "registrationHash", "designHash", "samplingFrameHash", "frameHash", "algorithmVersion", "manifestFrozenAt", "supersedesSampleManifestHash", "selectionFormula", "allocationMethod", "totalEligibleClusterCount", "crossCellComponentCount", "clusterOwnershipRule", "stratumAllocations", "hamiltonAudit", "clusterCount", "selectedRows", "manifestRootTupleOrder", "primaryAnalysisWeight", "secondaryWeightMethod", "resultBlind", "rerollAfterAnyLabelOrResult", "replacementAfterAnyLabelOrResult", "sampleManifestHash"],
  MachineReferenceLabelV1: ["schemaVersion", "designId", "registrationHash", "sampleManifestHash", "clusterId", "itemId", "referenceSourceType", "humanReferenceClaimAllowed", "labelStage", "role", "raterPseudonym", "adjudicatorPseudonym", "requestedProvider", "observedProvider", "requestedModel", "observedModel", "promptHash", "schemaHash", "inputReceiptHash", "solveAttemptReceiptHash", "labelAttemptReceiptHash", "blindingAttestations", "rawLabel", "rawTaxonomyCodes", "rawSeverity", "rawFindingFamilies", "rawUncertain", "requiresAdjudication", "finalLabel", "finalTaxonomyCodes", "finalSeverity", "finalFindingFamilies", "acceptedCodeSets", "rawLabelHashes", "disagreementStatus", "adjudicationReasonCodes", "disagreementAdjudicationReceiptHash", "labeledAt", "labelHash"],
  ProviderAuthorizationV1: ["schemaVersion", "designId", "registrationHash", "samplingFrameHash", "sampleManifestHash", "runtimeConfigHash", "promptSetHash", "schemaSetHash", "runnerCommit", "runnerHash", "adapterHash", "provider", "region", "endpoint", "model", "roleSet", "requestTemplateHash", "payloadSetHash", "allowedOrigin", "egressAllowlist", "egressDenylist", "privacyScreenHash", "rightsScreenHash", "issuedAt", "expiresAt", "maximumAttempts", "maximumSuccessfulCalls", "maximumInputTokens", "maximumOutputTokens", "maximumTokens", "maximumEstimatedUsd", "currency", "concurrencyCap", "priceSnapshot", "authorizedBy", "nonAuthorizations", "previousAuthorizationHash", "authorizationHash"],
  ProviderAttemptReceiptV1: ["schemaVersion", "designId", "runId", "registrationHash", "frameRegistrationHash", "sampleManifestHash", "runtimeConfigHash", "authorizationHash", "referenceSealHash", "executionRegistrationHash", "itemIdPseudonym", "itemHash", "attemptId", "role", "sequenceNumber", "requestedProvider", "observedProvider", "requestedModel", "observedModel", "requestedEndpoint", "observedEndpointHostname", "requestBodyHash", "responseBodyHash", "startedAt", "finishedAt", "latencyMs", "httpStatus", "providerRequestId", "finishReason", "parseStatus", "schemaStatus", "attemptStatus", "inputTokens", "outputTokens", "reasoningTokens", "totalTokens", "costRateSnapshotHash", "estimatedCost", "cumulativeCost", "retryClassification", "redactedError", "appendOnly", "atomicWrite", "fileMode", "completedItemCommitMarkerHash", "cacheHit", "providerInvoiceAuthoritative", "previousReceiptHash", "selfHash"],
  ItemEvaluationResultV1: ["schemaVersion", "designId", "registrationHash", "sampleManifestHash", "clusterId", "itemId", "referenceSourceType", "humanGoldClaimAllowed", "sealedFinalMachineReferenceLabelHash", "machineAttemptReceiptHashes", "requestedProvider", "observedProvider", "requestedModel", "observedModel", "rawMachineFindingCodes", "finalMachineFindingCodes", "finalMachineFindingFamilies", "finalMachineSeverity", "referenceFindingCodes", "referenceFindingFamilies", "matchRecords", "unresolvedReference", "resultHash"],
  FinalEvaluationReceiptV1: ["schemaVersion", "designId", "registrationHash", "frameRegistrationHash", "sampleManifestHash", "referenceSealHash", "executionRegistrationHash", "authorizationHashes", "attemptChainHeadHash", "itemResultSetHash", "expectedSampleSize", "completedItemCount", "failedItemCount", "missingItemCount", "resolvedPositiveN", "resolvedNegativeN", "unresolvedN", "invalidN", "confusionMatrix", "metricResults", "findingMatchingMatrixHash", "clusterStrataWeightSummaryHash", "machinePanelAgreement", "executionSummary", "requestedObservedProviderModels", "deviations", "completionStatus", "executionIntegrityStatus", "generalizationRequested", "policyRevisionRequired", "decisionCeiling", "claimCeiling", "conclusion", "calculatedAt", "previousReceiptHash", "receiptHash"],
  IndependentReviewReceiptV1: ["schemaVersion", "designId", "registrationHash", "frameRegistrationHash", "sampleManifestHash", "referenceSealHash", "finalEvaluationReceiptHash", "reviewerLane", "reviewerPseudonym", "provenanceType", "humanReferenceClaimAllowed", "sourceArtifactsReadOnly", "mainScorerImported", "recomputationImplementationHash", "recomputedFrameHash", "recomputedSampleHash", "recomputedReferenceSealHash", "recomputedAttemptChainHash", "recomputedMatchingHash", "recomputedMetricSetHash", "recomputedDecision", "reviewedItemCount", "reviewedAttemptCount", "reviewStatus", "discrepancyCodes", "reviewedAt", "previousReceiptHash", "receiptHash"],
};

test("nine frozen schemas have exact IDs, versions, required fields, and closed roots", async () => {
  const directory = new URL("./schemas/", import.meta.url);
  const files = (await readdir(directory)).filter((name) => name.endsWith(".schema.json")).sort();
  assert.equal(files.length, 9);
  const schemas = await Promise.all(files.map(async (name) => JSON.parse(await readFile(new URL(name, directory), "utf8"))));
  assert.deepEqual(schemas.map((schema) => schema.title).sort(), expected);
  for (const schema of schemas) {
    assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
    assert.equal(schema.$id, `https://mais.hk/schemas/research/${schema.title}.schema.json`);
    assert.equal(schema.properties.schemaVersion.const, schema.title);
    assert.deepEqual(schema.required, expectedRequired[schema.title]);
    assert.equal(schema.additionalProperties, false);
  }
});

test("provenance, hash binding, append-only chain, and conclusion vocabularies are explicit", async () => {
  const directory = new URL("./schemas/", import.meta.url);
  const names = await readdir(directory);
  const text = (await Promise.all(names.filter((name) => name.endsWith(".schema.json")).map((name) => readFile(new URL(name, directory), "utf8")))).join("\n");
  for (const requiredTerm of ["registrationHash", "sampleManifestHash", "previousReceiptHash", "rawLabel", "finalLabel", "provenanceType"]) {
    assert.equal(text.includes(`"${requiredTerm}"`), true, `${requiredTerm} must be explicit`);
  }
  assert.doesNotMatch(text, /"PASS"|"APPROVED"|"PRODUCTION"|"PROMOTION"/u);

  const independent = JSON.parse(await readFile(new URL("IndependentReviewReceiptV1.schema.json", directory), "utf8"));
  assert.deepEqual(independent.properties.reviewStatus.enum, ["CONCURRED", "DISCREPANCY", "UNREVIEWABLE"]);
  const final = JSON.parse(await readFile(new URL("FinalEvaluationReceiptV1.schema.json", directory), "utf8"));
  assert.deepEqual(final.properties.conclusion.enum, ["INVALID_FOR_GENERALIZATION", "EXECUTION_INTEGRITY_FAILED", "POLICY_REVISION_REQUIRED_MACHINE_REFERENCE", "INCONCLUSIVE_MACHINE_REFERENCE"]);
  assert.equal(JSON.stringify(final).includes("LIMITED"), false);
  const manifest = JSON.parse(await readFile(new URL("SampleManifestV1.schema.json", directory), "utf8"));
  assert.equal(manifest.properties.stratumAllocations.minItems, 9);
  assert.equal(manifest.properties.stratumAllocations.maxItems, 9);
  assert.equal(manifest.properties.stratumAllocations.minContains, 1);
  assert.equal(manifest.properties.selectedRows.minItems, 60);
  assert.equal(manifest.properties.selectedRows.maxItems, 60);
  assert.equal(manifest.properties.rerollAfterAnyLabelOrResult.const, false);
  assert.equal(manifest.properties.replacementAfterAnyLabelOrResult.const, false);
  const machineReference = JSON.parse(await readFile(new URL("MachineReferenceLabelV1.schema.json", directory), "utf8"));
  assert.equal(machineReference.$defs.rawCode.enum.includes("FALSE_ACCEPT_CORRECT_RESPONSE"), true);
  assert.equal(machineReference.$defs.finalCode.enum.includes("FALSE_ACCEPT_CORRECT_RESPONSE"), false);
  assert.equal(machineReference.$defs.operationalCode.enum.length, 16);
  const itemResult = JSON.parse(await readFile(new URL("ItemEvaluationResultV1.schema.json", directory), "utf8"));
  assert.equal(itemResult.$defs.operationalCode.enum.length, 16);
  for (const forbidden of ["FALSE_ACCEPT_CORRECT_RESPONSE", "NO_FINDING", "UNASSESSABLE", "SCHEMA_GAP"]) {
    assert.equal(itemResult.$defs.operationalCode.enum.includes(forbidden), false);
  }
});
