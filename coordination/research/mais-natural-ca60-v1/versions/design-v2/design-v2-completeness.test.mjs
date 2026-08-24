import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildDesignRegistration,
  evaluateC0MandatoryTriggers,
  findingMetricKey,
  reduceC0RoleOutputs,
} from "./design-contract.mjs";

const design = buildDesignRegistration();

test("frame population and estimand population are separated and runtime-bound", () => {
  assert.equal(design.scope.framePopulation, "ALL_CA_RUNTIME_VISIBLE_QUESTIONS");
  assert.equal(design.scope.estimandPopulation, "EGRESS_ELIGIBLE_CA_RUNTIME_VISIBLE_QUESTIONS");
  assert.equal(design.runtimePopulation.curriculumProfile, "US_CA_MATH");
  assert.equal(design.runtimePopulation.actor, "AUTHENTICATED_STUDENT");
  assert.equal(design.runtimePopulation.gradeProjectionCount, 13);
  assert.deepEqual(design.runtimePopulation.gradeProjections, ["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]);
  assert.equal(design.runtimePopulation.runtimeConfigHashBoundLater, true);
  assert.equal(design.runtimePopulation.maxAnswerChoices, 0);
  assert.equal(design.runtimePopulation.accommodationOptionTruncation, false);
});

test("closed eligibility rules preserve missing content as defect opportunities", () => {
  assert.deepEqual(design.eligibility.exclusionCodes, [
    "NON_CALIFORNIA_TRACK",
    "NOT_VISIBLE_IN_FROZEN_RUNTIME_CONFIG",
    "SYNTHETIC_TEST_OR_CANDIDATE_ONLY",
    "PII_CREDENTIAL_INTERNAL_PATH_OR_RESTRICTED_EGRESS",
    "UNSTABLE_SERIALIZATION_OR_READ_CRASH",
  ]);
  assert.equal(design.eligibility.missingAnswerOptionsExplanationRemainIncluded, true);
  assert.equal(design.eligibility.unresolvedFrameSerializationFailureDisposition, "BLOCK_FRAME_FREEZE");
  assert.deepEqual(design.eligibility.allowedResponseForms, ["multiple-choice", "fill-in", "short-answer"]);
  assert.deepEqual(design.eligibility.allowedDifficulties, ["Low", "Medium", "High"]);
});

test("lineage edges use only frozen fine-grained keys and oversized components block the frame", () => {
  assert.deepEqual(design.homologyClustering.sourceLineageKeys, {
    K5: ["batchId", "clusterId", "topicId", "responseForm"],
    G6_12: ["batchId", "generationTemplate", "topicId", "responseForm"],
    CCSS: ["batchId", "sourceLessonSlug", "topicId", "responseForm"],
  });
  assert.deepEqual(design.homologyClustering.provenanceOnlyNeverEdges, ["packageId", "batchId", "sourceIds", "sourceModule"]);
  assert.equal(design.homologyClustering.missingLineage, null);
  assert.equal(design.homologyClustering.blockers.disposition, "BLOCK_ENTIRE_FRAME_FREEZE_AND_VERSION_DESIGN");
  assert.deepEqual(design.homologyClustering.requiredAuditOutputs, ["clusterCount", "singletonRate", "largest20Components", "clusterSizeDistribution", "anomalyLedger"]);
});

test("machine panel roles, blinding, adjudication and no-human-gold boundary are exact", () => {
  assert.deepEqual(design.machineReferenceWorkflow.panelRoleOrder, ["A_SOLVE", "A_LABEL", "B_SOLVE", "B_LABEL", "ADJUDICATOR"]);
  assert.equal(design.machineReferenceWorkflow.labelSourceType, "machine_reference_panel");
  assert.equal(design.machineReferenceWorkflow.humanGold, false);
  assert.equal(design.machineReferenceWorkflow.correlatedSameModelErrorRisk, true);
  assert.deepEqual(design.labeling.adjudicationQueueTriggers, ["ANY_FIELD_DISAGREEMENT", "ANY_RATER_UNCERTAIN", "ANY_RATER_P0", "ANY_RATER_P1"]);
  assert.equal(design.labeling.maximumFinalAdjudicationsPerItem, 1);
  assert.deepEqual(design.labeling.retryAllowedOnlyFor, ["TRANSIENT_NETWORK_FAILURE", "SCHEMA_FAILURE"]);
  assert.equal(design.labeling.a11Meaning, "INDEPENDENT_RECOMPUTATION_NOT_HUMAN_GOLD");
  assert.equal(design.labeling.a18Meaning, "METHOD_AND_CLAIM_BOUNDARY_REVIEW_NOT_HUMAN_GOLD");
});

test("taxonomy families and ambiguous literal treatment are frozen", () => {
  assert.equal(design.taxonomy.familyByCode.FALSE_ACCEPT_CORRECT_RESPONSE, "RESPONSE_ACCEPTANCE");
  assert.equal(design.taxonomy.acceptedCodeSetShape, "SORTED_SINGLETON_PRIMARY_CODE_SAME_FAMILY");
  assert.equal(design.taxonomy.ambiguousLiteral.FALSE_ACCEPT_CORRECT_RESPONSE, "RESERVED_AMBIGUOUS_LITERAL_REQUIRES_SCHEMA_GAP_AND_ADJUDICATION_UNTIL_NEW_DESIGN");
  assert.equal(design.taxonomy.unknownCodeDisposition, "SCHEMA_GAP");
  assert.equal(design.taxonomy.schemaGapOrUndecidedDisposition, "UNRESOLVED_REFERENCE");
  assert.equal(design.taxonomy.statusCodesEnterFindingMatching, false);
  assert.equal(design.taxonomy.ambiguousLiteralFinalDisposition, "SCHEMA_GAP_PLUS_UNRESOLVED_REFERENCE");
  assert.equal(design.taxonomy.ambiguousLiteralMetricCreditAllowed, false);
  assert.equal(findingMetricKey({ itemId: "i-1", family: "RESPONSE_ACCEPTANCE", code: "FALSE_ACCEPT_NEAR_MISS" }), "i-1|RESPONSE_ACCEPTANCE|FALSE_ACCEPT_NEAR_MISS");
  assert.throws(() => findingMetricKey({ itemId: "i-1", family: null, code: "NO_FINDING" }), /status code/u);
  assert.throws(() => findingMetricKey({ itemId: "i-1", family: "RESPONSE_ACCEPTANCE", code: "FALSE_ACCEPT_CORRECT_RESPONSE" }), /ambiguous literal/u);
});

test("all primary, descriptive, severity, and agreement metrics have denominator policies", () => {
  assert.deepEqual(design.analysis.surfaceMetrics, ["SENSITIVITY", "SPECIFICITY", "FPR", "TP", "FP", "FN", "TN"]);
  assert.deepEqual(design.analysis.findingMetrics, ["FAMILY_RECALL", "ACCEPTED_CODE_AND_FAMILY_EXACT_RECALL", "FAMILY_PRECISION", "EXACT_PRECISION", "FALSE_FINDINGS_PER_100_ITEMS"]);
  assert.deepEqual(design.analysis.severityMetrics, ["P0_FALSE_NEGATIVES", "P1_RECALL", "P2_MISSED_OR_UNRESOLVED_RATE"]);
  assert.deepEqual(design.analysis.panelAgreementMetrics, ["RAW_AGREEMENT", "COHENS_KAPPA", "GWET_AC1", "FAMILY_JACCARD", "CODE_JACCARD", "SEVERITY_AGREEMENT", "ADJUDICATION_RATE"]);
  assert.equal(design.analysis.denominatorPolicy.degenerateNoPositiveReference, "REPORT_NULL_POINT_AND_UNDERPOWERED");
  assert.equal(design.analysis.denominatorPolicy.degenerateAgreementSingleCategory, "REPORT_RAW_AND_AC1_WITH_KAPPA_NULL");
  assert.equal(design.analysis.missingData.operationalMetricCodeCount, 16);
  assert.deepEqual(design.analysis.missingData.perMissingItemMaximumUnmatchedOpportunities, { FAMILY_RECALL: 16, EXACT_RECALL: 16, P1_RECALL: 7, P2_MISSED_OR_UNRESOLVED: 4 });
  assert.deepEqual(design.analysis.missingData.maximumAtThreeMissingItems, { FAMILY_RECALL: 48, EXACT_RECALL: 48, P1_RECALL: 21, P2_MISSED_OR_UNRESOLVED: 12 });
  assert.equal(design.analysis.missingData.counterfactualLedgerSeparateFromObservedCounts, true);
  assert.match(design.analysis.missingData.p0MissingRule, /not fabricated/u);
});

test("provider envelopes, budgets, C0 triggers and audit selection are exact", () => {
  const qwen = design.providerControls.qwenEnvelope;
  assert.equal(qwen.region, "cn-beijing");
  assert.deepEqual(qwen.requestTemplate, { stream: false, n: 1, enable_thinking: true, temperature: 0, top_p: "OMITTED", response_format: { type: "json_object" }, max_tokens: 8192, tools: [], search: "DISABLED" });
  assert.deepEqual([qwen.successfulCallsMinimum, qwen.successfulCallsMaximum, qwen.attemptCap, qwen.tokenCap, qwen.usdCap, qwen.concurrencyCap], [240, 300, 610, 4_000_000, 25, 4]);
  const deepSeek = design.providerControls.deepSeekEnvelope;
  assert.deepEqual(deepSeek.requestTemplate, { stream: false, n: 1, thinking: "ENABLED", reasoning_effort: "high", temperature: 0, top_p: "OMITTED", max_tokens: 8192, response_format: { type: "json_object" }, tools: [] });
  assert.deepEqual([deepSeek.successfulCallsMinimum, deepSeek.successfulCallsMaximum, deepSeek.attemptCap, deepSeek.tokenCap, deepSeek.usdCap, deepSeek.concurrencyCap], [180, 420, 850, 6_000_000, 25, 4]);
  assert.equal(deepSeek.c0PrimeTriggerEngineQwenInputCount, 0);
  assert.equal(deepSeek.c0PrimeRandomAudit.targetItems, 12);
  assert.equal(deepSeek.c0PrimeRandomAudit.basePerNonemptyCell, 1);
  assert.equal(deepSeek.c0PrimeRandomAudit.frozenBeforeQwenLabels, true);
  assert.equal(deepSeek.c0PrimeMandatoryTriggerPredicates.length, 9);
  assert.equal(deepSeek.c0PrimeUnknownPredicateDisposition, "TRIGGER");
  assert.equal(deepSeek.c0PrimeSelectionSetFormula, "UNION(MANDATORY_TRIGGER_SET,RANDOM_AUDIT_12_SET)");
  assert.equal(deepSeek.c0PrimeRoleOutputReduction, "FIVE_ROLE_CONSERVATIVE_UNION_WITH_MAX_SEVERITY_AND_UNRESOLVED_ON_ANY_INVALID_OR_CONFLICT");
  assert.equal(design.providerControls.combinedEnvelope.warningAtFraction, 0.8);
  assert.equal(design.providerControls.combinedEnvelope.failBeforeFraction, 1);
});

test("C0 mandatory predicates are deterministic, unknown triggers, random audit is separate, and five-role reduction is conservative", () => {
  const predicates = {
    possibleP0OrP1MathOrAnswerKey: false,
    sourceRightsOrReconstructionRisk: "UNKNOWN",
    ageGradeCurriculumLanguageOrRegionRisk: false,
    answerCriticalVisualOrEvidence: true,
    deterministicVsBPrimeConflict: false,
    critiqueVsRevisionConflict: false,
    invalidTaxonomySchemaOrRole: false,
    outOfScopeMetadataOrEvidence: false,
    declaredOutOfDistribution: false,
  };
  const evaluated = evaluateC0MandatoryTriggers(predicates);
  assert.deepEqual(evaluated.triggerCodes, ["SOURCE_RIGHTS_OR_RECONSTRUCTION_RISK", "ANSWER_CRITICAL_VISUAL_OR_EVIDENCE"]);
  assert.equal(evaluated.randomAuditSelected, null);
  const missing = { ...predicates };
  delete missing.declaredOutOfDistribution;
  assert.equal(evaluateC0MandatoryTriggers(missing).triggerCodes.includes("DECLARED_OUT_OF_DISTRIBUTION"), true);
  const malformed = { ...predicates, critiqueVsRevisionConflict: { malformed: true } };
  assert.equal(evaluateC0MandatoryTriggers(malformed).triggerCodes.includes("CRITIQUE_VS_REVISION_CONFLICT"), true);
  const five = Array.from({ length: 5 }, (_, index) => ({
    role: `C0_PRIME_ROLE_${index + 1}`,
    valid: true,
    findings: index < 3 ? [{ itemId: "i-1", code: "EVIDENCE_MISMATCH", family: "EVIDENCE_INTEGRITY", severity: "P1" }] : [],
  }));
  assert.deepEqual(reduceC0RoleOutputs(five), {
    status: "RESOLVED",
    severity: "P1",
    findings: [{ itemId: "i-1", code: "EVIDENCE_MISMATCH", family: "EVIDENCE_INTEGRITY", severity: "P1", supportingRoleCount: 3 }],
  });
  assert.deepEqual(reduceC0RoleOutputs([...five].reverse()), reduceC0RoleOutputs(five));
  five[4].valid = false;
  assert.equal(reduceC0RoleOutputs(five).status, "UNRESOLVED");
  assert.throws(() => reduceC0RoleOutputs([...five, { role: "C0_PRIME_ROLE_6", valid: true, findings: [] }]), /exactly five/u);
});

test("authorization bindings, freeze order, lifecycle invalidation and canary are exact", () => {
  assert.deepEqual(design.freezeChain, ["DESIGN_REGISTRATION_V2", "FRAME_REGISTRATION", "SAMPLE_REGISTRATION", "QWEN_AUTHORIZATION", "REFERENCE_LABEL_SEAL", "DEEPSEEK_AUTHORIZATION", "EXECUTION_REGISTRATION"]);
  assert.deepEqual(design.providerControls.authorizationRequiredBindings, ["registrationRootHash", "frameHash", "sampleManifestHash", "promptHash", "schemaHash", "runnerCommit", "runnerHash", "adapterHash", "provider", "model", "endpoint", "dataRegion", "egressAllowlist", "privacyScreenHash", "rightsScreenHash", "inputTokenCap", "outputTokenCap", "totalTokenCap", "successfulCallCap", "attemptCap", "usdCap", "currency", "priceSnapshotHash", "issuedAt", "expiresAt", "authorizer", "nonAuthorizations"]);
  assert.equal(design.executionLifecycle.preFirstProviderChange, "NEW_VERSION_WITH_SUPERSEDES");
  assert.equal(design.executionLifecycle.postFirstProviderMaterialChange, "INVALID_FOR_GENERALIZATION_PRESERVE_RECEIPTS_NEW_REGISTRATION_RESTART_FIRST_ITEM");
  assert.equal(design.executionLifecycle.registeredCanary, "FIRST_SORTED_MANIFEST_ITEM_INCLUDED_IN_60");
  assert.deepEqual(design.executionLifecycle.receiptStorageContract, {
    appendOnly: true,
    atomicWrite: true,
    fileMode: "0600",
    completedItemCommitMarker: true,
    resumeOnlyMissingRoles: true,
    cacheHitIsProviderExecution: false,
    failedAttemptsConsumeAttemptCap: true,
    providerInvoiceIsFinalCostAuthority: true,
  });
  assert.deepEqual(design.interfaces.cliCommands, ["register", "freeze-frame", "audit-clusters", "freeze-sample", "label-qwen", "seal-reference-labels", "dry-run", "authorize-check", "execute-deepseek --canary 1", "execute-deepseek --resume", "score", "verify", "export-aggregate-report"]);
  assert.equal(design.interfaces.allCommandsVerifyUpstreamHashesAndFailClosed, true);
  assert.equal(design.artifactStorage.protectedRoot, ".local/mais-natural-ca60-v1/");
  assert.equal(design.artifactStorage.publicFrameContentAllowed, false);
  assert.equal(design.deterministicSelection.preResultReplacementRule, "RECORDED_CLOSED_EXCLUSION_NEXT_RANK_NEW_SAMPLE_VERSION_WITH_SUPERSEDES");
});

test("preflight evidence is aggregate only and predecessor golden hashes remain bound", async () => {
  const evidence = JSON.parse(await readFile(new URL("./preflight-oversized-components-aggregate.json", import.meta.url), "utf8"));
  assert.equal(evidence.containsItemText, false);
  assert.deepEqual(evidence.aggregateOversizedGroups.map((entry) => entry.approximateItemCount), [492, 1500, 810]);
  assert.equal(evidence.disposition, "DESIGN_V1_SUPERSEDED_BEFORE_FRAME_FREEZE");
  assert.equal(evidence.predecessorRegistrationHash, "663303a7331f5c230f3e3238f0253edea81e37dbd9674ab84db28c02d64c6ce7");
});
