import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { buildFullSampleContractFixture } from "./test-fixtures.mjs";
import { evaluateAggregatePublicationAuthorizationV1 } from "./review-gate.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_DIR = path.join(HERE, "schemas");

async function readSchema(title) {
  return JSON.parse(await readFile(path.join(SCHEMA_DIR, `${title}.schema.json`), "utf8"));
}

function sorted(value) {
  return [...value].sort((left, right) => left.localeCompare(right, "en"));
}

function assertExactTopLevelShape(schema, artifact) {
  const artifactFields = sorted(Object.keys(artifact));
  assert.deepEqual(sorted(Object.keys(schema.properties)), artifactFields, `${schema.title} properties must equal the real artifact fields`);
  assert.deepEqual(sorted(schema.required), artifactFields, `${schema.title} must require every real artifact field`);
  assert.equal(schema.additionalProperties, false);
}

test("V4 sampling frame V2 schema exactly describes the frozen real frame rows", async () => {
  const schema = await readSchema("SamplingFrameRowV2");
  const { frameRows } = buildFullSampleContractFixture();
  const eligible = frameRows.find((row) => row.eligible);
  const excluded = frameRows.find((row) => !row.eligible);

  assertExactTopLevelShape(schema, eligible);
  assert.deepEqual(Object.keys(excluded), Object.keys(eligible));
  assert.equal(schema.properties.egressRights.type, "object");
  assert.deepEqual(sorted(schema.properties.egressRights.required), [
    "copyrightExternalizationAuthorized",
    "piiScreenPassed",
    "providerEgressAllowed",
    "secretsScreenPassed",
  ]);
  assert.equal(schema.properties.serializationStatus.const, "SERIALIZED");
  assert.deepEqual(schema.properties.analysisWeightPurpose.enum, [
    "SECONDARY_CLUSTER_REPRESENTATIVE_INVENTORY_IPW",
    "OUTSIDE_SECONDARY_ESTIMAND_NONREPRESENTATIVE",
    "EXCLUDED_FROM_ALL_ESTIMANDS",
  ]);
  assert.ok(schema.properties.clusterId.type.includes("null"));
  assert.equal(schema.allOf[0].then.properties.egressRights.properties.providerEgressAllowed.const, true);
  assert.equal(schema.allOf[1].then.properties.inclusionProbability.const, 0);
  assert.equal(schema.allOf[1].then.properties.analysisWeight.const, 0);
  assert.equal(schema.allOf[2].then.properties.analysisWeightPurpose.const, "SECONDARY_CLUSTER_REPRESENTATIVE_INVENTORY_IPW");
  assert.equal(schema.allOf[3].then.properties.analysisWeightPurpose.const, "OUTSIDE_SECONDARY_ESTIMAND_NONREPRESENTATIVE");
});

test("V4 initial sample manifest V2 schema freezes the real full-frame Hamilton contract", async () => {
  const schema = await readSchema("SampleManifestV2");
  const { sampleManifest } = buildFullSampleContractFixture();

  assertExactTopLevelShape(schema, sampleManifest);
  assert.equal(schema.properties.algorithmVersion.const, "natural-ca60-full-frame-hamilton-v3");
  assert.equal(schema.properties.allocationMethod.const, "CAPACITY_AWARE_ITERATIVE_HAMILTON_MINIMUM_TWO");
  assert.equal(schema.properties.manifestTupleRootOrder.const, "SORTED_ITEM_ID_PLUS_ITEM_HASH_PLUS_CLUSTER_ID");
  assert.equal(schema.properties.secondaryEstimand.const, "FROZEN_ELIGIBLE_HOMOLOGY_CLUSTER_REPRESENTATIVE_INVENTORY");
  assert.equal(schema.properties.secondaryWeightMethod.const, "INVERSE_INCLUSION_PROBABILITY_DESCRIPTIVE_WITH_KISH_EFFECTIVE_N");
  assert.equal(schema.properties.clusterOwnershipRule.const, "LOWEST_MEMBER_SELECTION_DIGEST_THEN_ITEM_ID");
  assert.equal(schema.properties.selectedClusterRule.const, "LOWEST_REPRESENTATIVE_SELECTION_DIGEST_THEN_ITEM_ID");
  assert.equal(schema.properties.representativeSelectionRule.const, "DETERMINISTIC_LOWEST_MEMBER_SELECTION_DIGEST_THEN_ITEM_ID");
  assert.equal(schema.properties.selectionFormula.const,
    "SHA256(UTF8(JCS([designHash,frameHash,algorithmVersion,stratum,clusterId,itemHash])))");
  assert.equal(schema.properties.selectionDigestCanonicalization.const, "RFC8785_JCS");
  assert.equal(schema.properties.selectionDigestByteEncoding.const, "UTF-8");
  assert.deepEqual(schema.properties.selectionDigestFieldOrder.const,
    ["designHash", "frameHash", "algorithmVersion", "stratum", "clusterId", "itemHash"]);
  assert.equal(schema.properties.selectionDesignHashSemantic.const,
    "designHash is the frozen design registrationHash");
  assert.equal(schema.properties.selectionFrameHashSemantic.const,
    "frameHash is the timestamp-excluded frameSelectionContentRootHash; it is not samplingFrameHash and not frameRegistrationHash");
  assert.equal(schema.properties.selectionGoldenVectorDigest.const,
    "e8e1baec2d4685808b99bf15624401646b04c88d3e769300e395befad00b9028");
  assert.equal(schema.properties.sourceEnumerationEvidenceContractHash.const,
    "7dbcce3a4f723fdfa8c9aa08acb0bcf4b78f3a696d144209f352d7c7677e005f");
  assert.equal(schema.properties.freezeSequence.const, 2);
  assert.equal(schema.properties.clusterCount.const, 60);
  assert.deepEqual(sorted(Object.keys(schema.$defs.row.properties)), sorted(Object.keys(sampleManifest.selectedRows[0])));
  assert.deepEqual(sorted(schema.$defs.row.required), sorted(Object.keys(sampleManifest.selectedRows[0])));
  assert.deepEqual(sorted(Object.keys(schema.$defs.hamiltonRound.properties)),
    sorted(Object.keys(sampleManifest.hamiltonAudit[0])));
  assert.deepEqual(sorted(schema.$defs.hamiltonRound.required),
    sorted(Object.keys(sampleManifest.hamiltonAudit[0])));
  assert.deepEqual(sorted(Object.keys(schema.$defs.hamiltonCell.properties)),
    sorted(Object.keys(sampleManifest.hamiltonAudit[0].cells[0])));
  assert.deepEqual(sorted(schema.$defs.hamiltonCell.required),
    sorted(Object.keys(sampleManifest.hamiltonAudit[0].cells[0])));
});

test("runtime extraction and frame-registration schemas bind complete inventory evidence", async () => {
  const runtimeSchema = await readSchema("RuntimeExtractionSnapshotV1");
  const frameSchema = (await readSchema("PersistedArtifactDefinitionsV1")).$defs.FrameRegistrationV2;
  const { runtimeExtractionSnapshot, frameRegistration } = buildFullSampleContractFixture();

  assertExactTopLevelShape(runtimeSchema, runtimeExtractionSnapshot);
  assertExactTopLevelShape(frameSchema, frameRegistration);
  assert.equal(runtimeSchema.properties.completenessProved.const, true);
  assert.equal(runtimeSchema.properties.serializationFailureCount.minimum, 0,
    "the protected snapshot can record failures even though frame freeze requires zero");
  assert.equal(frameSchema.properties.serializationFailureCount.const, 0,
    "the public frozen frame is only valid after the failure ledger is empty");
  assert.equal(runtimeSchema.properties.sourceEnumerationEvidenceContractHash.const,
    "7dbcce3a4f723fdfa8c9aa08acb0bcf4b78f3a696d144209f352d7c7677e005f");
  assert.deepEqual(sorted(Object.keys(runtimeSchema.$defs.sourceEnumerationReceipt.properties)),
    sorted(Object.keys(runtimeExtractionSnapshot.runtimeSourceEnumerationReceipt)));
  assert.deepEqual(sorted(runtimeSchema.$defs.sourceEnumerationReceipt.required),
    sorted(Object.keys(runtimeExtractionSnapshot.runtimeSourceEnumerationReceipt)));
  assert.deepEqual(sorted(Object.keys(runtimeSchema.$defs.gradeProjectionInvocation.properties)),
    sorted(Object.keys(runtimeExtractionSnapshot.runtimeSourceEnumerationReceipt.gradeProjectionInvocations[0])));
  assert.deepEqual(sorted(runtimeSchema.$defs.gradeProjectionInvocation.required),
    sorted(Object.keys(runtimeExtractionSnapshot.runtimeSourceEnumerationReceipt.gradeProjectionInvocations[0])));
  assert.equal(runtimeSchema.$defs.sourceEnumerationReceipt.properties.gradeProjectionInvocationCount.const, 13);
  assert.deepEqual(runtimeSchema.$defs.sourceEnumerationReceipt.properties.gradeProjectionOrder.const,
    ["K", "P1", "P2", "P3", "P4", "P5", "P6", "S1", "S2", "S3", "S4", "S5", "S6"]);
  assert.equal(runtimeSchema.$defs.sourceEnumerationReceipt.properties.duplicateIdRule.const,
    "ANY_REPEATED_ITEM_ID_WITHIN_OR_ACROSS_13_GRADE_PROJECTIONS_BLOCKS_FREEZE_NO_COLLAPSE_NO_FIRST_WINS");
  assert.equal(runtimeSchema.$defs.sourceEnumerationReceipt.properties.sourceCompletenessProvedByDesign.const, false);
  assert.equal(frameSchema.properties.unresolvedSerializationFailureCount, undefined);
  assert.equal(frameSchema.properties.runtimeExtractionSnapshot, undefined,
    "public frame registration binds only the protected runtime snapshot hash");
  assert.equal(frameSchema.properties.cleanSourceEvidence, undefined,
    "public frame registration binds only the protected clean-source evidence hash");
  assert.equal(frameSchema.properties.schemaVersion.const, "FrameRegistrationV2");
  assert.equal(frameSchema.properties.routeExecutionCompletedAt.$ref, "#/$defs/timestamp");
  assert.equal(frameSchema.properties.dependencyClosureCompletedAt.$ref, "#/$defs/timestamp");
  assert.equal(frameSchema.properties.scannerExecutionCompletedAt.$ref, "#/$defs/timestamp");
});

test("V4 provider authorization and attempt schemas encode trusted roots, exact wire leaves, and pessimistic reserve states", async () => {
  const authorization = await readSchema("ProviderAuthorizationV1");
  const attempt = await readSchema("ProviderAttemptReceiptV1");
  const wire = await readSchema("ProviderWireEvidenceV1");
  const qwenAuthorization = authorization.allOf.find((entry) => entry.if?.properties?.provider?.const === "ALIBABA_CLOUD_MODEL_STUDIO").then.properties;
  const deepSeekAuthorization = authorization.allOf.find((entry) => entry.if?.properties?.provider?.const === "DEEPSEEK_DIRECT").then.properties;
  const qwenAttempt = attempt.allOf.find((entry) => entry.if?.properties?.provider?.const === "ALIBABA_CLOUD_MODEL_STUDIO").then.properties;
  const deepSeekAttempt = attempt.allOf.find((entry) => entry.if?.properties?.provider?.const === "DEEPSEEK_DIRECT").then.properties;
  const success = attempt.allOf.find((entry) => entry.if?.properties?.attemptStatus?.const === "SUCCESS").then.properties;
  const schemaFailure = attempt.allOf.find((entry) => entry.if?.properties?.attemptStatus?.const === "SCHEMA_FAILURE")?.then?.properties;
  const pending = attempt.allOf.find((entry) => entry.if?.properties?.usageState?.const === "USAGE_UNKNOWN_PENDING_PROVIDER_RECONCILIATION").then.properties;

  assert.equal(authorization.additionalProperties, false);
  assert.equal(attempt.additionalProperties, false);
  assert.deepEqual(authorization.required.sort(), Object.keys(authorization.properties).sort());
  assert.deepEqual(attempt.required.sort(), Object.keys(attempt.properties).sort());
  assert.equal(qwenAuthorization.maximumInputTokens.const, 4_000_000);
  assert.equal(qwenAuthorization.maximumOutputTokens.const, 4_000_000);
  assert.equal(deepSeekAuthorization.maximumInputTokens.const, 6_000_000);
  assert.equal(deepSeekAuthorization.maximumOutputTokens.const, 6_000_000);
  assert.equal(qwenAuthorization.region.const, undefined);
  assert.equal(qwenAuthorization.endpoint.const, undefined);
  assert.equal(qwenAuthorization.priceSnapshot.properties.dataRegion.const, undefined);
  assert.equal(authorization.properties.providerRouteDecisionHash.$ref, "#/$defs/sha256");
  for (const field of ["deepSeekRouteProbeAuthorizationHash", "deepSeekRouteProbeReceiptHash", "referenceSealHash", "qwenAttemptChainHash", "directBillingEvidenceHash", "dataRegionEvidenceHash"]) {
    assert.equal(deepSeekAuthorization[field].$ref, "#/$defs/sha256", field);
    assert.equal(qwenAuthorization[field].type, "null", field);
  }
  assert.equal(qwenAttempt.model.const, "qwen3.8-max");
  assert.equal(deepSeekAttempt.model.const, "deepseek-v4-pro");
  assert.deepEqual(attempt.properties.attemptStatus.enum, [
    "SUCCESS", "TRANSIENT_NETWORK_FAILURE", "TIMEOUT", "HTTP_429", "HTTP_500",
    "CONNECTION_LOST_AFTER_DISPATCH", "MALFORMED_200", "SCHEMA_FAILURE", "CAP_BLOCKED_BEFORE_REQUEST",
  ]);
  assert.deepEqual(attempt.properties.retryClassification.enum, [
    "NONE", "TRANSIENT_RETRY_ALLOWED_ONLY_IF_REMAINING_CAP_COVERS_NEW_RESERVE", "SCHEMA_RETRY_ALLOWED", "PERMANENT_NO_RETRY", "CAP_BLOCKED",
  ]);
  assert.equal(success.usageState.const, "PROVIDER_USAGE_RECONCILED");
  for (const field of [
    "rawWireResponseHash",
    "parsedProviderEnvelopeHash",
    "extractedMessageContentHash",
    "parsedRolePayloadHash",
    "providerUsageHash",
  ]) assert.equal(success[field].pattern, "^[0-9a-f]{64}$", field);
  assert.equal(schemaFailure.dispatchState.const, "DISPATCHED");
  assert.equal(schemaFailure.usageState.const, "PROVIDER_USAGE_RECONCILED");
  assert.equal(schemaFailure.httpStatus.const, 200);
  assert.equal(schemaFailure.parseStatus.const, "VALID");
  assert.equal(schemaFailure.schemaStatus.const, "INVALID");
  assert.equal(schemaFailure.retryClassification.const, "SCHEMA_RETRY_ALLOWED");
  assert.equal(schemaFailure.redactedError.const, "SCHEMA_VALIDATION_FAILURE_REDACTED");
  for (const field of [
    "rawWireResponseHash",
    "parsedProviderEnvelopeHash",
    "extractedMessageContentHash",
    "parsedRolePayloadHash",
    "providerUsageHash",
  ]) assert.equal(schemaFailure[field].pattern, "^[0-9a-f]{64}$", `schema failure ${field}`);
  assert.equal(pending.reservedTokens.minimum, 1);
  assert.equal(pending.reservedUsd.exclusiveMinimum, 0);
  assert.equal(pending.reconciliationReceiptHash.type, "null");
  assert.equal(attempt.properties.requestBodyHash.anyOf.some((entry) => entry.type === "null"), true);
  assert.equal(Object.hasOwn(attempt.properties, "itemId"), false);
  assert.equal(Object.hasOwn(attempt.properties, "parsedProjectionHash"), false);
  assert.equal(attempt.properties.itemIdPseudonym.pattern, "^ca60-[0-9a-f]{32}$");
  assert.equal(attempt["x-mais-cross-field-constraint"],
    "requestBodyHash=wireRequestBodyHash; responseBodyHash=rawWireResponseHash; parsedOutputHash=parsedRolePayloadHash; providerUsageHash binds the exact raw provider usage object while rawUsage binds normalized prompt/completion/reasoning/total counters; itemId is forbidden");

  const wireFields = [
    "schemaVersion", "logicalRequest", "logicalRequestHash", "wireRequestBody",
    "wireRequestSerializationAlgorithm", "wireRequestBodyBytes", "wireRequestBodyHash",
    "rawWireResponseEncoding", "rawWireResponseBytes", "rawWireResponseHash",
    "parsedProviderEnvelope", "parsedProviderEnvelopeHash", "providerResponseId",
    "providerResponseModel", "finishReason", "providerUsage", "providerUsageHash", "extractedMessageContent",
    "extractedMessageContentHash", "parsedRolePayload", "parsedRolePayloadHash",
    "parsedRolePayloadSchemaStatus", "parsedRolePayloadSchemaErrorHash", "adapterTransformHash",
  ];
  assert.deepEqual(sorted(Object.keys(wire.properties)), sorted(wireFields));
  assert.deepEqual(sorted(wire.required), sorted(wireFields));
  assert.equal(Object.hasOwn(wire.properties, "parsedProjectionHash"), false);
  assert.equal(Object.hasOwn(wire.properties, "output"), false);
  assert.equal(wire.$defs.qwenWireRequestBody.required.includes("enable_search"), true);
  assert.equal(wire.$defs.qwenWireRequestBody.properties.enable_search.const, false);
  assert.deepEqual(sorted(wire.$defs.providerUsage.required), [
    "completionTokens", "promptTokens", "reasoningTokens", "totalTokens",
  ]);
  assert.deepEqual(sorted(attempt.properties.rawUsage.required), [
    "completionTokens", "promptTokens", "reasoningTokens", "totalTokens",
  ]);
});

test("DeepSeek output and completed-item marker schemas match the full execution leaf shapes", async () => {
  const output = await readSchema("DeepSeekRoleOutputV1");
  const marker = await readSchema("CompletedItemCommitMarkerV1");
  const outputFields = [
    "schemaVersion", "designId", "registrationHash", "sampleManifestHash", "referenceSealHash",
    "executionRegistrationHash", "authorizationHash", "itemId", "itemIdPseudonym", "itemHash",
    "clusterId", "role", "promptHash", "schemaHash", "parsedPayload", "parsedOutputHash",
    "attemptReceiptHash", "outputHash",
  ];
  const markerFields = [
    "schemaVersion", "designId", "registrationHash", "sampleManifestHash", "referenceSealHash",
    "executionRegistrationHash", "itemId", "itemHash", "clusterId", "roleOrder",
    "attemptReceiptHashes", "outputHashes", "atomicWrite", "fileMode", "markerHash",
  ];

  assert.deepEqual(sorted(Object.keys(output.properties)), sorted(outputFields));
  assert.deepEqual(sorted(output.required), sorted(outputFields));
  assert.deepEqual(sorted(Object.keys(marker.properties)), sorted(markerFields));
  assert.deepEqual(sorted(marker.required), sorted(markerFields));
  assert.equal(output.additionalProperties, false);
  assert.equal(marker.additionalProperties, false);
  assert.deepEqual(marker.properties.roleOrder.minItems, 2);
  assert.deepEqual(marker.properties.roleOrder.maxItems, 7);
  assert.equal(output.properties.parsedPayload.oneOf.length, 3);
  assert.equal(output.allOf.length, 3, "critique, revision, and C0 payload unions are frozen separately");
});

test("final receipt schema matches the recomputed V4 artifact, explicit summaries, and one unified nonresolved universe", async () => {
  const schema = await readSchema("FinalEvaluationReceiptV1");
  const fields = [
    "schemaVersion", "designId", "registrationHash", "frameRegistrationHash", "samplingFrameHash",
    "sampleManifestHash", "referenceSealHash", "qwenAuthorizationHash", "deepSeekAuthorizationHash",
    "executionRegistrationHash", "runtimeConfigHash", "runnerHash", "adapterHash", "itemResultSetHash",
    "counterfactualLedgerHash", "metricInputLedgerHash", "expectedSampleSize", "completeReceiptItemCount",
    "missingReceiptItemCount", "resolvedPositiveItemCount", "resolvedNegativeItemCount",
    "unresolvedReferenceItemCount", "invalidItemCount", "unifiedNonresolvedItemCount", "confusionMatrix", "metricResults",
    "completeAttemptReceiptCount", "receiptChainValid", "providerTupleValid", "capsValid",
    "terminalProviderFailure", "materialDeviation", "postResultDesignDrift", "labelLeakage",
    "unauthorizedProviderCall", "executionIntegrityStatus", "policyRevisionRequired",
    "structuralFeasibilityGatePassed", "decisionCeiling", "claimScopeCeiling", "conclusion",
    "recomputedFrameHash", "recomputedSampleHash", "recomputedAttemptChainHash", "recomputedMatchingHash",
    "recomputedMetricSetHash", "completedItemMarkerRoot", "c0ExecutionSetHash", "deviationEvidenceHash",
    "providerAggregates", "providerAggregatesHash", "matchingMatrixHash", "matchingMatrix",
    "strataSummaryHash", "strataSummary", "clusterWeightSummaryHash", "clusterWeightSummary",
    "kishEffectiveSampleSize", "agreementSummaryHash", "agreementSummary", "adjudicationSummary",
    "finalSummaryRootHash", "publicLimitations", "publicLimitationsHash", "calculatedAt", "finalFinishedAt",
    "previousReceiptHash", "receiptHash",
  ];
  const metricFields = [
    "metric", "metricKind", "numerator", "denominator", "independentContributingClusterCount",
    "pointEstimate", "oneSidedWilsonLcb95", "oneSidedWilsonUcb95", "twoSidedWilsonL95",
    "twoSidedWilsonU95", "clusterBootstrapP5", "clusterBootstrapP95", "bootstrapReplicates",
    "bootstrapValidReplicateCount", "bootstrapZeroDenominatorReplicateCount",
    "bootstrapZeroDenominatorRule", "bootstrapSeedDerivation", "bootstrapPercentileConvention",
    "worstCaseMissingLower", "worstCaseMissingUpper", "worstCaseMissingMethod", "adverseOpportunityAdditions",
    "conservativeLower", "conservativeUpper", "thresholdDirection", "threshold", "minimumN",
    "status", "decisionEligible",
  ];

  assert.deepEqual(sorted(Object.keys(schema.properties)), sorted(fields));
  assert.deepEqual(sorted(schema.required), sorted(fields));
  assert.deepEqual(sorted(Object.keys(schema.$defs.metric.properties)), sorted(metricFields));
  assert.deepEqual(sorted(schema.$defs.metric.required), sorted(metricFields));
  assert.equal(schema.properties.expectedSampleSize.const, 60);
  assert.equal(schema.properties.unifiedNonresolvedItemCount.maximum, 60);
  assert.match(schema["x-mais-cross-field-constraint"], /values above 3 require EXECUTION_INTEGRITY_FAILED/u);
  assert.equal(schema.properties.decisionCeiling.const, "INCONCLUSIVE_MACHINE_REFERENCE");
  assert.equal(schema.properties.claimScopeCeiling.const, "CALIFORNIA_RUNTIME_EGRESS_ELIGIBLE_MACHINE_REFERENCE_PILOT_ONLY");
  assert.deepEqual(schema.$defs.metric.properties.worstCaseMissingMethod.enum, [
    "EXACT_FEASIBLE_SURFACE_WORLD_ENUMERATION_WITH_ONE_SIDED_95_WILSON_PER_WORLD",
    "FINITE_OPERATIONAL_CODE_MONOTONE_CLOSED_FORM_WITH_ONE_SIDED_95_WILSON_PROVEN_EQUIVALENT_TO_EXHAUSTIVE_ADDITION_COUNT_ENUMERATION_FOR_U_0_THROUGH_3",
    "INTEGRITY_LIMIT_EXCEEDED_NO_DECISION_BOUND",
  ]);
  assert.equal(schema.$defs.metric.allOf[0].then.properties.bootstrapReplicates.const, 0);
  assert.equal(schema.$defs.metric.allOf[1].then.properties.bootstrapReplicates.const, 10_000);
  assert.equal(schema.$defs.metric.allOf[2].then.properties.decisionEligible.const, false);
  assert.equal(schema.$defs.metric.allOf[3].then.properties.threshold.const, 0.9);
  assert.equal(schema.$defs.metric.allOf[4].then.properties.threshold.const, 0.95);
  assert.equal(schema.$defs.metric.allOf[5].then.properties.threshold.const, 0.05);
  assert.equal(schema.$defs.metric.allOf[6].then.properties.threshold.const, 0.85);
  assert.equal(schema.$defs.metric.allOf[7].then.properties.threshold.const, 0.9);
  assert.equal(schema.$defs.metric.allOf[8].then.properties.threshold.const, 0.1);
  assert.deepEqual(schema.properties.conclusion.enum, [
    "INVALID_FOR_GENERALIZATION", "EXECUTION_INTEGRITY_FAILED",
    "POLICY_REVISION_REQUIRED_MACHINE_REFERENCE", "INCONCLUSIVE_MACHINE_REFERENCE",
  ]);
  assert.equal(schema["x-mais-cross-field-constraint"], "completeReceiptItemCount+missingReceiptItemCount=60; unifiedNonresolvedItemCount=missingReceiptItemCount+unresolvedReferenceItemCount+invalidItemCount; values above 3 require EXECUTION_INTEGRITY_FAILED");
  assert.deepEqual(schema.properties.unifiedNonresolvedItemCount, { type: "integer", minimum: 0, maximum: 60 });
});

test("A11 and A18 review receipt schemas match the independently recomputed review gate", async () => {
  const a11 = await readSchema("IndependentReviewReceiptV1");
  const a18 = await readSchema("ClaimBoundaryReviewReceiptV1");
  const a11Fields = [
    "schemaVersion", "designId", "reviewerLane", "reviewerPseudonym", "provenanceType",
    "humanReferenceClaimAllowed", "sourceArtifactsReadOnly", "mainScorerImported",
    "independenceAttestation", "mainScorerImplementationHash", "mainScorerDependencyHash",
    "verifierProofHash", "recomputationImplementationHash", "recomputationDependencyHash",
    "recomputationImportGraphHash", "forbiddenScorerScanHash", "verificationCommandHash",
    "verificationRuntimeHash", "verificationBaselineProofHash", "reviewedItems", "reviewedItemCount",
    "reviewedAttemptCount", "reviewStatus", "discrepancyCodes", "unreviewableReason", "reviewedAt",
    "previousReceiptHash", "recomputedFrameHash", "recomputedSampleHash",
    "recomputedRuntimeSourceEnumerationRootHash", "independentSourceEnumerationReceiptHash",
    "recomputedReferenceSealHash",
    "recomputedQwenAttemptChainHash", "recomputedDeepSeekAttemptChainHash", "recomputedItemResultSetHash",
    "recomputedObservedLedgerHash", "recomputedCounterfactualLedgerHash", "recomputedMatchingHash",
    "recomputedMetricSetHash", "recomputedDecision", "activeDesignRegistrationHash",
    "activeExecutionRegistrationHash", "latestFinalEvaluationReceiptHash", "referenceSealHash",
    "frameRegistrationHash", "sampleManifestHash", "thresholdHash", "taxonomyHash", "labelSchemaHash",
    "adjudicationMethodHash", "severityRuleHash", "promptSetHash", "schemaSetHash", "runnerHash",
    "adapterHash", "statisticalPowerHash", "designSupersedesHash", "methodComponentRootSetHash", "reviewLedgerHeadHash",
    "finalFinishedAt", "receiptHash",
  ];
  const a18Fields = [
    "schemaVersion", "designId", "registrationHash", "executionRegistrationHash",
    "finalEvaluationReceiptHash", "referenceSealHash", "frameRegistrationHash", "sampleManifestHash",
    "thresholdHash", "taxonomyHash", "labelSchemaHash", "adjudicationMethodHash", "severityRuleHash",
    "publicLimitationSetHash", "publicClaimTemplateHash", "independentReviewReceiptHash",
    "reviewLedgerHeadHash", "reviewerLane", "provenanceType", "reviewScope", "humanGoldLabelReview",
    "sourceArtifactsReadOnly", "reviewedDecision", "reviewedClaimScopeCeiling", "methodReviewEvidence",
    "claimBoundaryStatus", "objectionCodes", "objectionReason", "reviewedAt", "previousReceiptHash",
    "receiptHash",
  ];

  assert.deepEqual(sorted(Object.keys(a11.properties)), sorted(a11Fields));
  assert.deepEqual(sorted(a11.required), sorted(a11Fields));
  assert.deepEqual(sorted(Object.keys(a18.properties)), sorted(a18Fields));
  assert.deepEqual(sorted(a18.required), sorted(a18Fields));
  assert.equal(a11.properties.reviewStatus.enum.includes("CONCURRED"), true);
  assert.equal(a11.properties.provenanceType.const, "A11_INDEPENDENT_RECOMPUTATION");
  assert.equal(a11.properties.recomputedRuntimeSourceEnumerationRootHash.$ref, "#/$defs/sha256");
  assert.equal(a11.properties.independentSourceEnumerationReceiptHash.$ref, "#/$defs/sha256");
  assert.equal(a18.properties.provenanceType.const, "A18_METHOD_AND_CLAIM_BOUNDARY_REVIEW");
  assert.equal(a18.properties.humanGoldLabelReview.const, false);
  assert.equal(a18.$defs.methodReviewEvidence.required.includes("methodComponentRootSetHash"), true);
  assert.equal(a18.$defs.methodReviewEvidence.properties.methodComponentRootSetHash.$ref, "#/$defs/sha256");
  assert.deepEqual(a18.properties.claimBoundaryStatus.enum, ["NO_OBJECTION", "OBJECTION"]);
});

test("protected current heads and public aggregate artifact heads require the frozen method root set", async () => {
  const catalog = await readSchema("PersistedArtifactDefinitionsV1");
  const protectedRoot = catalog.$defs.ProtectedReviewInputRootV1;
  const currentHeads = protectedRoot.properties.currentHeads;
  const publicReport = catalog.$defs.PublicAggregateReportV1;
  const publicHeads = publicReport.properties.artifactHashes;

  assert.equal(currentHeads.type, "object");
  assert.equal(currentHeads.additionalProperties, false);
  assert.equal(currentHeads.required.includes("methodComponentRootSetHash"), true);
  assert.equal(currentHeads.properties.methodComponentRootSetHash.$ref, "#/$defs/sha256");
  assert.equal(publicHeads.type, "object");
  assert.equal(publicHeads.additionalProperties, false);
  assert.equal(publicHeads.required.includes("methodComponentRootSetHash"), true);
  assert.equal(publicHeads.properties.methodComponentRootSetHash.$ref, "#/$defs/sha256");
});

test("aggregate publication authorization status is a closed blocked artifact rather than a caller-selected export grant", async () => {
  const catalog = await readSchema("PersistedArtifactDefinitionsV1");
  const schema = catalog.$defs.AggregatePublicationAuthorizationStatusV1;
  const status = evaluateAggregatePublicationAuthorizationV1();
  assertExactTopLevelShape(schema, status);
  assert.equal(schema.properties.schemaVersion.const, "AggregatePublicationAuthorizationStatusV1");
  assert.equal(schema.properties.allowed.const, false);
  assert.equal(schema.properties.status.const, "BLOCKED_PENDING_A21_PROTECTED_CUSTODY_REGISTRY");
  assert.equal(schema.properties.authorizationAvailable.const, false);
  assert.equal(schema.properties.callerSuppliedRootsAuthorized.const, false);
  assert.deepEqual(schema.properties.blockerCodes.const, ["EXECUTION_CUSTODY_REGISTRY_NOT_IMPLEMENTED"]);
  assert.equal(schema.properties.requiredCustodyArtifactSchema.const, "ProtectedExecutionCustodyRegistryV1");
  assert.equal(schema.properties.protectedRegistryRootHash.type, "null");
  assert.equal(schema.properties.runnerHash.type, "null");
});

test("C0 trigger and execution schemas freeze the evidence-derived union without reference leakage", async () => {
  const trigger = await readSchema("C0TriggerInputV1");
  const executionSet = await readSchema("C0ExecutionSetV1");
  const triggerFields = [
    "schemaVersion", "designId", "registrationHash", "sampleManifestHash",
    "executionRegistrationHash", "itemHash", "clusterId", "itemIdPseudonym",
    "localDeterministicEvidence", "bPrimeCritique", "bPrimeRevision", "validatedScope",
    "registeredRandomAudit", "qwenInputCount", "derivedAtStage", "inputHash",
  ];
  const localEvidenceFields = [
    "schemaVersion", "algorithmSetHash", "itemHash", "mathAnswerKey",
    "rightsProvenanceReconstruction", "learnerFit", "answerCriticalEvidence",
    "validation", "deterministicFindingKeys",
  ];
  const executionFields = [
    "schemaVersion", "designId", "registrationHash", "sampleManifestHash",
    "executionRegistrationHash", "registeredRandomAuditCount", "mandatoryItemCount",
    "uniqueC0ItemCount", "bPrimeSuccessfulCallCount", "c0SuccessfulCallCount",
    "expectedSuccessfulCallCount", "roleCallsPerC0Item", "c0Rows", "executionSetHash",
  ];
  const rowFields = ["itemIdPseudonym", "itemHash", "clusterId", "selectionReasonCodes"];

  assert.deepEqual(sorted(Object.keys(trigger.properties)), sorted(triggerFields));
  assert.deepEqual(sorted(trigger.required), sorted(triggerFields));
  assert.deepEqual(sorted(Object.keys(trigger.properties.localDeterministicEvidence.properties)), sorted(localEvidenceFields));
  assert.deepEqual(sorted(trigger.properties.localDeterministicEvidence.required), sorted(localEvidenceFields));
  assert.equal(trigger.properties.localDeterministicEvidence.additionalProperties, false);
  assert.equal(trigger.properties.qwenInputCount.const, 0);
  assert.equal(trigger.properties.qwenReferenceLabelHash, undefined);
  assert.deepEqual(trigger.properties.validatedScope.properties.declaredDistribution.enum, [
    "IN_SCOPE", "OUT_OF_DISTRIBUTION", "UNKNOWN", "MALFORMED",
  ]);

  assert.deepEqual(sorted(Object.keys(executionSet.properties)), sorted(executionFields));
  assert.deepEqual(sorted(executionSet.required), sorted(executionFields));
  assert.deepEqual(sorted(Object.keys(executionSet.properties.c0Rows.items.properties)), sorted(rowFields));
  assert.deepEqual(sorted(executionSet.properties.c0Rows.items.required), sorted(rowFields));
  assert.deepEqual(executionSet.properties.c0Rows.items.properties.selectionReasonCodes.items.enum, [
    "REGISTERED_RANDOM_AUDIT", "MANDATORY_POLICY_TRIGGER",
  ]);
});

test("counterfactual schema preserves observed counts and one conservative nonresolved universe", async () => {
  const schema = await readSchema("CounterfactualLedgerV1");
  const confusionFields = ["tp", "fp", "fn", "tn"];
  const findingCountFields = [
    "referenceFindingCount", "machineFindingCount", "familyMatchedReferenceCount",
    "exactMatchedReferenceCount", "familyMatchedMachineCount", "exactMatchedMachineCount",
    "unmatchedReferenceCount", "unmatchedMachineCount", "p0ReferenceCount",
    "p0FalseNegativeCount", "p0OpportunityItemCount", "p0FalseNegativeItemCount",
    "p1ReferenceCount", "p1MatchedCount", "p1OpportunityItemCount", "p2ReferenceCount",
    "p2MissedCount", "p2OpportunityItemCount", "familyOpportunityItemCount",
    "precisionOpportunityItemCount",
  ];
  const nonresolvedFields = [
    "itemId", "clusterId", "reason", "sealedReferenceDisposition", "observedMachineSurfacePrediction",
    "sealedReferenceFindingCount", "sealedP1ReferenceFindingCount", "sealedP2ReferenceFindingCount",
  ];
  const surfaceWorldFields = ["worldIndex", "assignments", "confusionMatrix"];
  const assignmentFields = [
    "itemId", "clusterId", "reason", "observedMachineSurfacePrediction",
    "assignedMachineSurfaceFinding", "assignedReferenceDisposition", "classification",
  ];

  assert.deepEqual(sorted(Object.keys(schema.properties.observedConfusionMatrix.properties)), sorted(confusionFields));
  assert.deepEqual(sorted(schema.properties.observedConfusionMatrix.required), sorted(confusionFields));
  assert.deepEqual(sorted(Object.keys(schema.properties.observedFindingCounts.properties)), sorted(findingCountFields));
  assert.deepEqual(sorted(schema.properties.observedFindingCounts.required), sorted(findingCountFields));
  assert.deepEqual(sorted(Object.keys(schema.properties.nonresolvedItems.items.properties)), sorted(nonresolvedFields));
  assert.deepEqual(sorted(schema.properties.nonresolvedItems.items.required), sorted(nonresolvedFields));
  assert.deepEqual(schema.properties.nonresolvedItems.items.properties.reason.enum, [
    "MISSING_RECEIPT", "UNRESOLVED_REFERENCE", "UNRESOLVED_MACHINE", "INVALID",
  ]);
  assert.deepEqual(schema.properties.nonresolvedItems.items.properties.sealedReferenceDisposition.enum,
    ["RESOLVED_POSITIVE", "RESOLVED_NEGATIVE", "UNRESOLVED_REFERENCE", "INVALID"]);
  assert.equal(Object.hasOwn(schema.properties.nonresolvedItems.items.properties, "maximumAdverseOpportunityAdditions"), false);
  for (const field of ["sealedReferenceFindingCount", "sealedP1ReferenceFindingCount", "sealedP2ReferenceFindingCount"]) {
    assert.equal(schema.properties.nonresolvedItems.items.properties[field].$ref, "#/$defs/count");
  }
  assert.deepEqual(schema.properties.nonresolvedItems.items.properties.observedMachineSurfacePrediction.type, ["boolean", "null"]);
  assert.deepEqual(sorted(Object.keys(schema.properties.surfaceWorlds.items.properties)), sorted(surfaceWorldFields));
  assert.deepEqual(sorted(schema.properties.surfaceWorlds.items.required), sorted(surfaceWorldFields));
  assert.deepEqual(sorted(Object.keys(schema.properties.surfaceWorlds.items.properties.assignments.items.properties)), sorted(assignmentFields));
  assert.equal(schema.properties.surfaceEnumerationRule.const,
    "FIX_SEALED_REFERENCE_WHEN_RESOLVED_AND_ENUMERATE_TWO_MACHINE_STATES_FOR_MACHINE_NONRESOLUTION; FIX_OBSERVED_MACHINE_STATE_AND_ENUMERATE_TWO_REFERENCE_STATES_FOR_REFERENCE_NONRESOLUTION");
  assert.equal(schema.properties.surfaceWorlds.maxItems, 64);
  assert.equal(schema.properties.surfaceAssignmentCount.maximum, 64);
  assert.equal(schema.properties.referenceUnidentifiedItemCount.maximum, 60);
  assert.equal(schema.properties.machineNonresolvedResolvedReferenceItemCount.maximum, 60);
  assert.deepEqual(schema.properties.findingDecisionBoundUnidentified.type, "boolean");
  assert.equal(schema.properties.findingDecisionBound.anyOf.some((entry) => entry.type === "null"), true);
  assert.equal(schema.properties.maximumAdverseFindingOpportunityAdditions.anyOf.some((entry) => entry.type === "null"), true);
  const findingUnknown = schema.allOf.find((entry) => entry.if?.properties?.referenceUnidentifiedItemCount?.minimum === 1).then.properties;
  assert.equal(findingUnknown.findingDecisionBoundUnidentified.const, true);
  assert.deepEqual(findingUnknown.findingDecisionBound.const, { lower: 0, upper: 1 });
  assert.deepEqual(findingUnknown.maximumAdverseFindingOpportunityAdditions.const, {
    familyRecall: null,
    exactCodeAndFamilyRecall: null,
    p1Recall: null,
    p2MissedOrUnresolved: null,
  });
  assert.equal(schema["x-mais-surface-world-cardinality"],
    "surfaceAssignmentCount=PRODUCT(perItemCardinality); perItemCardinality=(machinePredictionKnown?1:2)*(referenceDispositionResolved?1:2); nonresolvedItemCount<=3 implies maximum 64");
  assert.equal(schema.allOf[0].then.properties.integrityLimitExceeded.const, false);
  assert.equal(schema.allOf[0].then.properties.surfaceEnumerationDisposition.const, "ENUMERATED_WITHIN_UNIFIED_NONRESOLVED_LIMIT");
  assert.equal(schema.allOf[1].then.properties.integrityLimitExceeded.const, true);
  assert.equal(schema.allOf[1].then.properties.surfaceWorlds.maxItems, 0);
  assert.equal(schema.allOf[1].then.properties.surfaceAssignmentCount.const, 0);
  assert.equal(schema.allOf[1].then.properties.surfaceEnumerationDisposition.const, "NOT_ENUMERATED_UNIFIED_NONRESOLVED_LIMIT_EXCEEDED");
});

test("missing-receipt schema preserves the complete ordered attempt subchain and every successful raw evidence leaf", async () => {
  const bundle = await readSchema("MissingReceiptItemBundleV1");
  const item = await readSchema("ItemEvaluationResultV1");
  const bundleFields = [
    "schemaVersion", "designId", "registrationHash", "sampleManifestHash", "executionRegistrationHash",
    "itemHash", "itemId", "itemIdPseudonym", "clusterId", "executionDisposition", "reasonCode",
    "itemAttemptReceipts", "successfulRoleEvidence", "terminalAttemptReceiptHash", "terminalAttemptChainHash",
    "machineEvaluationFinalized", "includedInUnifiedNonresolvedUniverse", "missingReceiptBundleHash",
  ];
  const successfulEvidenceFields = [
    "role", "attemptReceiptHash", "requestBody", "responseBody", "output", "wireEvidence",
  ];

  assert.deepEqual(sorted(Object.keys(bundle.properties)), sorted(bundleFields));
  assert.deepEqual(sorted(bundle.required), sorted(bundleFields));
  assert.equal(bundle.properties.observedMachineOutputAvailable, undefined);
  assert.equal(bundle.properties.itemAttemptReceipts.minItems, 1);
  assert.equal(bundle.properties.itemAttemptReceipts.maxItems, 14);
  assert.equal(bundle.properties.itemAttemptReceipts.items.$ref,
    "https://mais.hk/schemas/research/ProviderAttemptReceiptV1.schema.json");
  assert.deepEqual(sorted(Object.keys(bundle.$defs.successfulRoleEvidence.properties)), sorted(successfulEvidenceFields));
  assert.deepEqual(sorted(bundle.$defs.successfulRoleEvidence.required), sorted(successfulEvidenceFields));
  assert.equal(bundle.$defs.successfulRoleEvidence.additionalProperties, false);
  assert.equal(bundle.$defs.successfulRoleEvidence.properties.requestBody.$ref, "#/$defs/deepSeekFrozenProviderRequest");
  assert.equal(bundle.$defs.successfulRoleEvidence.properties.output.$ref,
    "https://mais.hk/schemas/research/DeepSeekRoleOutputV1.schema.json");
  assert.equal(bundle.$defs.successfulRoleEvidence.properties.wireEvidence.$ref,
    "https://mais.hk/schemas/research/ProviderWireEvidenceV1.schema.json");
  assert.deepEqual(sorted(bundle.$defs.deepSeekFrozenProviderRequest.required), sorted([
    "envelopeStage", "model", "stream", "thinking", "reasoning_effort", "temperature", "response_format",
    "max_tokens", "requestedSeed", "role", "prompt_hash", "response_schema_hash", "input",
  ]));
  assert.deepEqual(sorted(Object.keys(bundle.$defs.deepSeekFrozenProviderRequest.properties)),
    sorted(bundle.$defs.deepSeekFrozenProviderRequest.required));
  assert.equal(bundle.$defs.deepSeekFrozenProviderRequest.additionalProperties, false);
  assert.equal(bundle.properties.terminalAttemptReceiptHash.$ref, "#/$defs/sha256");
  assert.equal(bundle.properties.machineEvaluationFinalized.const, false);
  assert.equal(bundle.properties.includedInUnifiedNonresolvedUniverse.const, true);

  const missing = item.allOf.find((entry) => entry.if?.properties?.executionDisposition?.const === "MISSING_RECEIPT").then.properties;
  assert.equal(item.properties.attemptReceiptHashes.maxItems, 14);
  assert.equal(missing.attemptReceiptHashes.minItems, 1);
  assert.equal(missing.completedItemCommitMarkerHash.type, "null");
});

test("execution registration, deviation evidence, and item-result schemas match the recomputation inputs", async () => {
  const registration = await readSchema("ExecutionRegistrationV1");
  const deviation = await readSchema("ExecutionDeviationEvidenceV1");
  const item = await readSchema("ItemEvaluationResultV1");
  const registrationFields = [
    "schemaVersion", "designId", "registrationHash", "runtimeSourceBindingHash", "frameRegistrationHash", "samplingFrameHash",
    "sampleManifestHash", "qwenAuthorizationHash", "qwenAttemptChainHash", "qwenAttemptCount",
    "qwenSuccessfulReferenceCallCount", "firstQwenReferenceAttemptAt", "referenceSealHash", "referenceLabelsFrozenAt",
    "deepSeekRouteProbeAuthorizationHash", "deepSeekRouteProbeReceiptHash", "deepSeekRouteProbeAttemptCount", "deepSeekAuthorizationHash",
    "runtimeConfigHash", "promptSetHash", "schemaSetHash", "runnerCommit", "runnerHash", "adapterHash",
    "c0RandomAuditSelectionHash", "thresholdHash", "taxonomyHash", "labelSchemaHash",
    "adjudicationMethodHash", "severityRuleHash", "statisticalPowerHash", "designSupersedesHash",
    "providerEventCountBeforeExecutionRegistration", "deepSeekNaturalAttemptCountBeforeRegistration",
    "firstDeepSeekNaturalItemAttemptAt", "registeredAt",
    "executionRegistrationHash",
  ];
  const deviationFields = [
    "schemaVersion", "designId", "registrationHash", "executionRegistrationHash",
    "materialDeviationRecords", "postResultDesignDriftRecords", "labelLeakageRecords",
    "unauthorizedProviderCallRecords", "terminalProviderFailureRecords", "deviationEvidenceHash",
  ];
  const itemFields = [
    "schemaVersion", "designId", "registrationHash", "sampleManifestHash", "referenceSealHash",
    "executionRegistrationHash", "itemId", "itemHash", "clusterId", "executionDisposition",
    "machineDisposition", "machineNonresolvedReasonCodes", "referenceDisposition", "machineSurfaceFinding", "referenceFindings", "machineFindings",
    "finalReferenceLabelHash", "attemptReceiptHashes", "completedItemCommitMarkerHash", "itemResultHash",
  ];

  assert.deepEqual(sorted(Object.keys(registration.properties)), sorted(registrationFields));
  assert.deepEqual(sorted(registration.required), sorted(registrationFields));
  assert.equal(registration.properties.providerEventCountBeforeExecutionRegistration.minimum, 241);
  assert.equal(registration.properties.deepSeekNaturalAttemptCountBeforeRegistration.const, 0);
  assert.equal(registration.properties.firstDeepSeekNaturalItemAttemptAt.type, "null");
  assert.deepEqual(sorted(Object.keys(deviation.properties)), sorted(deviationFields));
  assert.deepEqual(sorted(deviation.required), sorted(deviationFields));
  assert.equal(deviation.$defs.records.items.additionalProperties, false);
  assert.deepEqual(sorted(Object.keys(item.properties)), sorted(itemFields));
  assert.deepEqual(sorted(item.required), sorted(itemFields));
  assert.deepEqual(item.properties.machineSurfaceFinding.type, ["boolean", "null"]);
  const complete = item.allOf.find((entry) => entry.if?.properties?.machineDisposition?.const === "RESOLVED").then.properties;
  const missing = item.allOf.find((entry) => entry.if?.properties?.executionDisposition?.const === "MISSING_RECEIPT").then.properties;
  assert.equal(complete.machineSurfaceFinding.type, "boolean");
  assert.equal(missing.machineSurfaceFinding.type, "null");
  assert.equal(item.$defs.operationalCode.enum.includes("FALSE_ACCEPT_CORRECT_RESPONSE"), true);
});

test("machine-reference schemas match raw, merged, adjudicated, item-seal, and global-seal artifacts", async () => {
  const label = await readSchema("MachineReferenceLabelV1");
  const itemSeal = await readSchema("ItemReferenceLabelSealV1");
  const globalSeal = await readSchema("ReferenceLabelSealV1");
  const rawFields = [
    "schemaVersion", "designId", "registrationHash", "sampleManifestHash", "clusterId", "itemId",
    "itemHash", "labelStage", "role", "promptLiteral", "promptHash", "schemaHash",
    "inputFieldNames", "ownSolveArtifactHash", "labelAttemptReceiptHash", "rawLabel",
    "rawTaxonomyCodes", "rawSeverity", "rawFindingFamilies", "rawFindings", "rawUncertain",
    "parsedOutputHash", "deepSeekOutputNotSeen", "labelHash",
  ];
  const mergedFields = [
    "schemaVersion", "designId", "registrationHash", "sampleManifestHash", "clusterId", "itemId",
    "itemHash", "labelStage", "finalizationMode", "role", "providerCall", "rawLabelHashes",
    "finalLabel", "finalTaxonomyCodes", "finalSeverity", "finalFindingFamilies", "finalFindings",
    "acceptedCodeSets", "disagreementStatus", "adjudicationReasonCodes",
    "disagreementAdjudicationReceiptHash", "labelHash",
  ];
  const adjudicatedFields = [
    ...mergedFields, "promptLiteral", "promptHash", "schemaHash", "inputFieldNames", "parsedOutputHash",
  ];
  const itemSealFields = [
    "schemaVersion", "designId", "registrationHash", "sampleManifestHash", "qwenAuthorizationHash",
    "itemId", "itemHash", "clusterId", "aSolveHash", "bSolveHash", "aLabelHash", "bLabelHash",
    "finalLabelHash", "baseAttemptReceiptHashes", "sealMode", "finalizationMode",
    "adjudicationAttemptReceiptHash", "sealHash",
  ];
  const globalFields = [
    "schemaVersion", "designId", "registrationHash", "frameRegistrationHash", "sampleManifestHash",
    "qwenAuthorizationHash", "expectedItemCount", "itemSeals", "itemSealRoot", "attemptChainHash",
    "totalAttemptCount", "baseSuccessfulCallCount", "adjudicationSuccessfulCallCount",
    "totalSuccessfulCallCount", "retryAttemptCount", "adjudicationRate", "agreementStatistics",
    "labelSourceType", "humanGold", "sameModelCorrelatedErrorRisk", "referenceLabelsFrozenAt",
    "providerEventCountAtSeal", "sealHash",
  ];
  const itemSummaryFields = [
    "itemId", "itemHash", "clusterId", "itemSealHash", "finalLabelHash", "sealMode",
    "adjudicationAttemptReceiptHash",
  ];
  const agreementFields = [
    "denominator", "rawLabelAgreement", "allFieldAgreement", "cohenKappa",
    "cohenKappaDegenerateReason", "gwetAc1", "gwetAc1DegenerateReason", "rawLabelCategories",
    "meanCodeJaccard", "meanFamilyJaccard", "severityAgreement", "adjudicationCount",
    "adjudicationRate", "interpretation",
  ];
  const raw = label.allOf.find((entry) => entry.if?.properties?.labelStage?.const === "RAW_RATER").then;
  const merged = label.allOf.find((entry) => entry.if?.properties?.labelStage?.const === "FINAL_AGREEMENT_MERGE").then;
  const adjudicated = label.allOf.find((entry) => entry.if?.properties?.labelStage?.const === "FINAL_ADJUDICATED").then;

  assert.deepEqual(sorted([...label.required, ...raw.required]), sorted(rawFields));
  assert.deepEqual(sorted([...label.required, ...merged.required]), sorted(mergedFields));
  assert.deepEqual(sorted([...label.required, ...adjudicated.required]), sorted(adjudicatedFields));
  assert.equal(label.$defs.operationalCode.enum.includes("FALSE_ACCEPT_CORRECT_RESPONSE"), true);
  assert.equal(label.$defs.familyMap.additionalProperties, false);
  assert.equal(label.$defs.familyMap.properties.FALSE_ACCEPT_CORRECT_RESPONSE.const, "RESPONSE_ACCEPTANCE");
  assert.deepEqual(sorted(Object.keys(itemSeal.properties)), sorted(itemSealFields));
  assert.deepEqual(sorted(itemSeal.required), sorted(itemSealFields));
  assert.equal(itemSeal.properties.baseAttemptReceiptHashes.minItems, 4);
  assert.equal(itemSeal.properties.baseAttemptReceiptHashes.maxItems, 4);
  assert.deepEqual(sorted(Object.keys(globalSeal.properties)), sorted(globalFields));
  assert.deepEqual(sorted(globalSeal.required), sorted(globalFields));
  assert.deepEqual(sorted(Object.keys(globalSeal.properties.itemSeals.items.properties)), sorted(itemSummaryFields));
  assert.deepEqual(sorted(globalSeal.properties.itemSeals.items.required), sorted(itemSummaryFields));
  assert.deepEqual(sorted(Object.keys(globalSeal.properties.agreementStatistics.properties)), sorted(agreementFields));
  assert.deepEqual(sorted(globalSeal.properties.agreementStatistics.required), sorted(agreementFields));
  assert.equal(globalSeal.properties.referenceLabelsFrozenAt.format, "date-time");
  assert.equal(globalSeal.properties.labelSourceType.const, "machine_reference_panel");
  assert.equal(globalSeal.properties.humanGold.const, false);
});

function assertRecursiveObjectShape(schemaNode, artifact, artifactPath = "design") {
  if (artifact === null || typeof artifact !== "object") return;
  if (Array.isArray(artifact)) {
    assert.equal(schemaNode.type, "array", `${artifactPath} must be an array schema`);
    if (artifact.length > 0 && artifact[0] !== null && typeof artifact[0] === "object") {
      assertRecursiveObjectShape(schemaNode.items, artifact[0], `${artifactPath}[]`);
    } else {
      assert.deepEqual(schemaNode.const, artifact, `${artifactPath} primitive array literals drifted`);
    }
    return;
  }
  assert.equal(schemaNode.type, "object", `${artifactPath} must be an object schema`);
  assert.equal(schemaNode.additionalProperties, false, `${artifactPath} must fail closed on unknown fields`);
  assert.deepEqual(sorted(Object.keys(schemaNode.properties)), sorted(Object.keys(artifact)), `${artifactPath} properties drifted`);
  assert.deepEqual(sorted(schemaNode.required), sorted(Object.keys(artifact)), `${artifactPath} required fields drifted`);
  for (const [key, value] of Object.entries(artifact)) {
    assertRecursiveObjectShape(schemaNode.properties[key], value, `${artifactPath}.${key}`);
  }
}

test("Natural V4 design schema recursively matches the live owner-decision-blocked candidate including role contracts", async () => {
  const schema = await readSchema("NaturalCaPilotDesignRegistrationV4");
  const registration = JSON.parse(await readFile(path.join(HERE, "design-registration.json"), "utf8"));

  assertRecursiveObjectShape(schema, registration);
  assert.deepEqual(sorted(Object.keys(schema.properties.providerControls.properties.staleSupersededProviderRoleContracts.properties.qwen.properties)),
    sorted(["ADJUDICATOR", "A_LABEL", "A_SOLVE", "B_LABEL", "B_SOLVE"]));
  assert.deepEqual(sorted(Object.keys(schema.properties.providerControls.properties.staleSupersededProviderRoleContracts.properties.deepSeek.properties)),
    sorted(["B_PRIME_CRITIQUE", "B_PRIME_REVISION", "C0_PRIME_ROLE_1", "C0_PRIME_ROLE_2", "C0_PRIME_ROLE_3", "C0_PRIME_ROLE_4", "C0_PRIME_ROLE_5"]));
  assert.equal(schema.properties.analysis.properties.missingData.properties.maximumUnifiedNonresolvedItems.const, 3);
  assert.equal(schema.properties.interfaces.properties.semanticExecutionSamplingFrameSchema.const, "SamplingFrameRowV2");
  assert.equal(schema.properties.interfaces.properties.semanticExecutionFrameRegistrationSchema.const, "FrameRegistrationV2");
  assert.equal(schema.properties.interfaces.properties.semanticExecutionInitialSampleManifestSchema.const, "SampleManifestV2");
  assert.equal(schema.properties.interfaces.properties.semanticExecutionReplacementSampleManifestSchema.const, "SampleManifestV3");
  assert.equal(schema.properties.interfaces.properties.legacyStructuralSchemasAcceptedForExecution.const, false);
  assert.equal(schema.properties.frozenAt.const, registration.frozenAt);
  assert.equal(schema.properties.registrationHash.const, null);
  assert.equal(schema.properties.interfaces.properties.schemaSetHash.const, null);
  assert.equal(schema.properties.interfaces.properties.canonicalSchemaHashes.const, null);
});

test("Natural schema catalog remains acyclic and never embeds registration-derived hash values", async () => {
  const schemaPath = path.join(SCHEMA_DIR, "NaturalCaPilotDesignRegistrationV4.schema.json");
  const raw = await readFile(schemaPath, "utf8");
  const registration = JSON.parse(await readFile(path.join(HERE, "design-registration.json"), "utf8"));
  const schemaSelfHash = createHash("sha256").update(raw, "utf8").digest("hex");
  const derivedHashes = new Set([
    registration.registrationHash,
    registration.interfaces.schemaSetHash,
    registration.hashDependencyDag.dagDefinitionHash,
    ...Object.values(registration.interfaces.canonicalSchemaHashes ?? {}),
    ...Object.values(registration.frozenContractHashes ?? {}),
    schemaSelfHash,
  ].filter((value) => typeof value === "string"
    && /^[0-9a-f]{64}$/u.test(value)
    && value !== "0".repeat(64)));

  for (const derivedHash of derivedHashes) {
    assert.equal(raw.includes(derivedHash), false,
      `Natural schema must not embed registration-derived or self-catalog hash ${derivedHash}`);
  }
  assert.equal(registration.hashDependencyDag.cycleFree, true);
});

test("fourth-round frame and replacement authority artifacts have exact closed parent schemas", async () => {
  const [catalog, frameV1, sampleV2] = await Promise.all([
    readSchema("PersistedArtifactDefinitionsV1"),
    readSchema("FrameRegistrationV1"),
    readSchema("SampleManifestV2"),
  ]);
  const exactFields = {
    TransitiveSourceModuleManifestV2: [
      "schemaVersion", "repositoryIdentity", "sourceCommit", "routeExecutionTrustRootHash",
      "dependencyClosureExtractorImplementationHash", "dependencyClosureRunnerReceiptHash",
      "dependencyClosureCompletedAt", "dependencyClosureTrustDescriptor", "dependencyClosureTrustRootHash",
      "dependencyClosureAuthorizationBoundary", "files", "fileCount", "rootFormula", "sourceModuleHash",
      "sourceModuleManifestHash",
    ],
    ThreeRouteSourceParityEvidenceV5: [
      "schemaVersion", "repositoryIdentity", "sourceCommit", "routeExecutionTrustDescriptor",
      "routeExecutionTrustRootHash", "runtimeLoaderEvidence", "mapFirstWinsUsed",
      "collisionCheckPrecedesAnyMapOrDeduplication", "rawItems", "convertedRuntimeItems",
      "convertedFullItems", "gradePublicItems", "rawRootHash", "convertedFullRootHash",
      "normalizedFullRootHash", "gradePublicUnionRootHash", "gradeProjectionInvocationRootHash",
      "converterRunnerReceiptHash", "normalizationRunnerReceiptHash", "publicProjectionRunnerReceiptHash",
      "routeExecutionCompletedAt", "routeParityProved", "parityEvidenceHash",
    ],
    FrameFreezeEvidenceV3: [
      "schemaVersion", "designId", "runtimeConfigHash", "sourceParityEvidenceHash",
      "sourceModuleManifestHash", "sourceModuleHash", "routeExecutionCompletedAt",
      "dependencyClosureCompletedAt", "scannerExecutionCompletedAt", "trustedRouteExecutionRootHash",
      "trustedDependencyClosureRootHash", "rightsDecisionTableHash", "trustedOwnerApprovalRootHash",
      "trustedScreeningPolicyHash", "trustedScannerImplementationHash", "trustedScannerRunnerHash",
      "trustedScannerExecutionReceiptInventoryHash", "scannerExecutionReceiptRootHash",
      "protectedFrameIdentityRootHash", "itemScreenEvidenceRootHash", "itemEgressDecisionRootHash",
      "itemCount", "frameFailureLedger", "frameFailureLedgerRootHash", "anomalyLedger",
      "anomalyLedgerRootHash", "frameFreezeEvidenceHash",
    ],
    SampleExecutionLedgerV2: [
      "schemaVersion", "designId", "sampleBindingKind", "sampleSelectionContentRootHash",
      "sampleVersion", "previousSampleManifestHash", "previousExecutionLedgerHash",
      "recorderImplementationHash", "recorderRunnerReceiptHash", "recordedAt", "entries",
      "entryCount", "entryRootHash", "appendOnly", "executionLedgerHash",
    ],
    PreResultReplacementV2: [
      "schemaVersion", "designId", "registrationHash", "frameRegistrationHash",
      "previousSampleManifestHash", "newSampleSelectionContentRootHash", "sampleVersion",
      "registeredAt", "newManifestFrozenAt", "exclusionItemId", "exclusionItemHash",
      "exclusionCode", "exclusionEvidenceHash", "trustedExclusionEvidenceInventoryHash",
      "beforeExecutionLedgerHash", "afterExecutionLedgerHash", "replacementItemId",
      "replacementItemHash", "replacementClusterId", "replacementStratum", "selectionRule",
      "providerAttemptReceiptCountAtRegistration", "referenceLabelCountAtRegistration",
      "evaluationResultCountAtRegistration", "resultBlind", "replacementAfterAnyLabelOrResult",
      "replacementReceiptHash",
    ],
    SampleReplacementAuthorizationV1: [
      "schemaVersion", "designId", "registrationHash", "frameRegistrationHash",
      "previousSampleManifestHash", "newSampleVersion", "newSampleSelectionContentRootHash",
      "newManifestFrozenAt", "exclusionEvidenceHash", "exclusionEvidenceInventoryHash",
      "trustedExclusionEvidenceInventoryHash", "exclusionEvidenceInventoryRecordedAt",
      "beforeExecutionLedgerHash", "beforeExecutionLedgerRecordedAt", "afterExecutionLedgerHash",
      "afterExecutionLedgerRecordedAt", "trustedExecutionLedgerRecorderImplementationHash",
      "trustedExecutionLedgerRunnerReceiptHash", "replacementReceiptHash",
      "exclusionEvidenceInventory", "beforeExecutionLedger", "afterExecutionLedger",
      "replacementReceipt", "replacementAuthorizationHash",
    ],
    FrameRegistrationV2: [
      ...frameV1.required,
      "routeExecutionCompletedAt", "dependencyClosureCompletedAt", "scannerExecutionCompletedAt",
    ],
    SampleManifestV3: [
      ...sampleV2.required,
      "replacementAuthorization", "replacementAuthorizationHash", "replacementAuthorityHistoryRootHash",
    ],
  };
  for (const [schemaVersion, fields] of Object.entries(exactFields)) {
    const definition = catalog.$defs[schemaVersion];
    assert.ok(definition, `${schemaVersion} definition missing`);
    assert.equal(definition.type, "object", schemaVersion);
    assert.equal(definition.additionalProperties, false, schemaVersion);
    assert.deepEqual(sorted(definition.required), sorted(fields), `${schemaVersion} required fields drifted`);
    assert.deepEqual(sorted(Object.keys(definition.properties)), sorted(fields), `${schemaVersion} properties drifted`);
    assert.equal(definition.properties.schemaVersion.const, schemaVersion);
  }
  const replacementHistoryV3Entry = catalog.$defs.replacementHistoryV3Entry;
  const authorityFields = [
    "trustedExclusionEvidenceInventoryHash", "beforeExecutionLedgerHash", "afterExecutionLedgerHash",
    "replacementReceiptHash", "replacementAuthorizationHash",
  ];
  assert.deepEqual(sorted(replacementHistoryV3Entry.required), sorted([
    ...sampleV2.$defs.replacement.required,
    ...authorityFields,
  ]));
  assert.deepEqual(sorted(Object.keys(replacementHistoryV3Entry.properties)), sorted(replacementHistoryV3Entry.required));
});

test("all 45 V4 schemas parse, fail closed, expose no stale V2 identity, and mark V1 sampling interfaces legacy-only", async () => {
  const files = (await readdir(SCHEMA_DIR)).filter((name) => name.endsWith(".schema.json")).sort();
  assert.equal(files.length, 45);
  const titles = files.map((name) => name.replace(/\.schema\.json$/u, ""));
  const natural = await readSchema("NaturalCaPilotDesignRegistrationV4");
  assert.deepEqual(sorted(natural.properties.interfaces.properties.schemaTitles.const), sorted(titles));

  function assertNoOpenObject(schemaNode, schemaPath) {
    if (!schemaNode || typeof schemaNode !== "object") return;
    assert.notEqual(schemaNode.additionalProperties, true, `${schemaPath} must not opt into unknown object fields`);
    for (const [key, child] of Object.entries(schemaNode)) assertNoOpenObject(child, `${schemaPath}.${key}`);
  }

  for (const file of files) {
    const raw = await readFile(path.join(SCHEMA_DIR, file), "utf8");
    const schema = JSON.parse(raw);
    assert.equal(schema.title, file.replace(/\.schema\.json$/u, ""));
    assert.equal(schema.additionalProperties, false, `${file} top-level must fail closed`);
    assertNoOpenObject(schema, file);
    assert.equal(raw.includes("MAIS-NATURAL-CA60-V2"), false, `${file} must not hard-code the stale V2 design identity`);
    assert.equal(raw.includes("a1b7d7ac6cf23b059dddc015c75b876d26a3576f9e5e3e07724ef8c5b8429de8"), false,
      `${file} must not hard-code the stale V2 registration hash`);
  }

  for (const legacyTitle of ["SamplingFrameRowV1", "SampleManifestV1"]) {
    const legacy = await readSchema(legacyTitle);
    assert.equal(legacy["x-mais-interface-status"], "LEGACY_STRUCTURAL_ONLY_NOT_ACCEPTED_FOR_EXECUTION");
    assert.equal(legacy["x-mais-semantic-execution-eligible"], false);
    assert.match(legacy.$comment, /legacy structural-only/iu);
  }
});
