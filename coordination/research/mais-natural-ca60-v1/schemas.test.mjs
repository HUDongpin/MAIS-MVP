import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const expected = [
  "FinalEvaluationReceiptV1",
  "IndependentReviewReceiptV1",
  "ItemEvaluationResultV1",
  "MachineReferenceLabelV1",
  "NaturalCaPilotDesignRegistrationV1",
  "ProviderAttemptReceiptV1",
  "ProviderAuthorizationV1",
  "SampleManifestV1",
  "SamplingFrameRowV1",
];
const expectedRequired = {
  NaturalCaPilotDesignRegistrationV1: ["schemaVersion", "designId", "designKind", "version", "frozenAt", "baselineCommitSha", "provenance", "scope", "eligibility", "stratification", "homologyClustering", "deterministicSelection", "machineReferenceWorkflow", "taxonomy", "labeling", "analysis", "providerControls", "artifactKinds", "freezeChain", "registrationHash"],
  SamplingFrameRowV1: ["schemaVersion", "designId", "registrationHash", "frameFrozenAt", "itemId", "itemContentHash", "runtimeOrigin", "runtimeVisible", "egressEligibility", "responseForm", "difficulty", "topicCodes", "normalizedPromptHash", "templateSkeletonHash", "homologyClusterId", "provenanceType"],
  SampleManifestV1: ["schemaVersion", "designId", "registrationHash", "samplingFrameHash", "manifestFrozenAt", "selectionFormula", "allocationMethod", "clusterCount", "selectedRows", "sampleManifestHash"],
  MachineReferenceLabelV1: ["schemaVersion", "designId", "registrationHash", "sampleManifestHash", "clusterId", "itemId", "provider", "model", "provenanceType", "attemptReceiptHash", "rawLabel", "rawTaxonomyCodes", "rawSeverity", "finalLabel", "finalTaxonomyCodes", "finalSeverity", "adjudicationStatus", "labeledAt", "labelHash"],
  ProviderAuthorizationV1: ["schemaVersion", "designId", "registrationHash", "samplingFrameHash", "sampleManifestHash", "provider", "model", "role", "allowedOrigin", "payloadSetHash", "issuedAt", "expiresAt", "maximumAttempts", "maximumInputTokensPerAttempt", "maximumOutputTokensPerAttempt", "maximumEstimatedUsd", "egressClassification", "authorizedBy", "authorizationHash"],
  ProviderAttemptReceiptV1: ["schemaVersion", "designId", "registrationHash", "sampleManifestHash", "authorizationHash", "provider", "model", "role", "clusterId", "itemId", "attemptNumber", "requestPayloadHash", "responsePayloadHash", "startedAt", "completedAt", "outcome", "inputTokens", "outputTokens", "estimatedUsd", "previousReceiptHash", "receiptHash"],
  ItemEvaluationResultV1: ["schemaVersion", "designId", "registrationHash", "sampleManifestHash", "clusterId", "itemId", "machineReferenceLabelHash", "evaluatedAttemptReceiptHash", "provenanceType", "rawLabel", "rawTaxonomyCodes", "rawSeverity", "finalLabel", "finalTaxonomyCodes", "finalSeverity", "adjudicationStatus", "matchStatus", "resultHash"],
  FinalEvaluationReceiptV1: ["schemaVersion", "designId", "registrationHash", "sampleManifestHash", "authorizationHashes", "attemptChainHeadHash", "itemResultSetHash", "resolvedPositiveN", "resolvedNegativeN", "unresolvedN", "sensitivity", "sensitivityLowerBound", "specificity", "specificityLowerBound", "conclusion", "calculatedAt", "previousReceiptHash", "receiptHash"],
  IndependentReviewReceiptV1: ["schemaVersion", "designId", "registrationHash", "sampleManifestHash", "finalEvaluationReceiptHash", "reviewerId", "reviewerIndependenceAttested", "provenanceType", "reviewStatus", "discrepancyCodes", "reviewedAt", "previousReceiptHash", "receiptHash"],
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
  assert.deepEqual(final.properties.conclusion.enum, ["INVALID_REGISTRATION", "BLOCKED_AUTHORIZATION", "INCONCLUSIVE_UNRESOLVED", "INCONCLUSIVE_MACHINE_REFERENCE", "LIMITED_MACHINE_REFERENCE"]);
});
