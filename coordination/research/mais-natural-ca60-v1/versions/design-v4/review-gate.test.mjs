import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateProtectedReviewInputRootV1,
  canExportAggregateReport as productionCanExportAggregateReport,
  evaluateAggregatePublicationAuthorizationV1,
  FORBIDDEN_INDEPENDENT_VERIFIER_IMPORT_PATTERNS,
  FROZEN_METRIC_ORDER,
  FROZEN_PUBLIC_LIMITATIONS,
  PUBLIC_CLAIM_TEMPLATE_HASH,
  PUBLIC_LIMITATION_SET_HASH,
  recomputeA11C0ReviewEvidenceV4,
  TRUSTED_CONTEXT_FIELDS,
  validateClaimBoundaryReviewReceiptShapeAndEvidenceV1,
  validateIndependentReviewReceiptV1 as productionValidateIndependentReviewReceiptV1,
  validatePublicAggregateReportShapeAndEvidence,
  validateReviewRegistrationContextV1 as productionValidateReviewRegistrationContextV1,
  validateVerifierIndependenceProofV1,
} from "./review-gate.mjs";
import {
  calculateArtifactHash,
  calculateProviderAttemptChainHash,
  canonicalJson,
  deriveCounterfactualLedger,
  deriveExecutionIntegrity,
  deriveObservedEvaluationLedger,
  deriveOverallDecision,
  FROZEN_METHOD_COMPONENT_ROOTS_V4_HASH,
  recomputeMetricSet,
  sha256Hex,
  validateFinalEvaluationBundle,
} from "./design-contract.mjs";
import { buildRuntimeSourceEnumerationReceiptV1 } from "./sample-contract.mjs";
import { buildFullFinalExecutionFixture } from "./reference-global.test.mjs";
import {
  buildFullSampleContractFixture,
  LINEAGE_RULE_APPROVAL_HASH,
  RUNTIME_CONFIG_HASH,
  SOURCE_COMMIT,
} from "./test-fixtures.mjs";
import {
  buildHypotheticalFrozenRegistrationV4,
  buildTestFixtureOnlySyntheticSealedRegistrationV4,
  createTestFixtureOnlyReviewGatePairV4,
} from "./review-test-fixtures.mjs";

const TEST_FIXTURE_ONLY_DESIGN_REGISTRATION = buildTestFixtureOnlySyntheticSealedRegistrationV4();
const HYPOTHETICAL_FROZEN_DESIGN_REGISTRATION = buildHypotheticalFrozenRegistrationV4();
const REVIEW_GATE_PAIR = await createTestFixtureOnlyReviewGatePairV4(
  TEST_FIXTURE_ONLY_DESIGN_REGISTRATION,
  HYPOTHETICAL_FROZEN_DESIGN_REGISTRATION,
);
const TEST_FIXTURE_ONLY_REVIEW_GATE = REVIEW_GATE_PAIR.firstGate;
const HYPOTHETICAL_FROZEN_REVIEW_GATE = REVIEW_GATE_PAIR.secondGate;
test.after(async () => REVIEW_GATE_PAIR.dispose());

function testReviewGateForRaw(raw) {
  return raw?.designRegistration?.registrationHash === HYPOTHETICAL_FROZEN_DESIGN_REGISTRATION.registrationHash
    ? HYPOTHETICAL_FROZEN_REVIEW_GATE
    : TEST_FIXTURE_ONLY_REVIEW_GATE;
}

function validateIndependentReviewReceiptV1(receipt, evidence) {
  return testReviewGateForRaw(evidence?.rawReviewEvidence)
    .validateIndependentReviewReceiptV1(receipt, evidence);
}

function validateReviewRegistrationContextV1(raw) {
  return testReviewGateForRaw(raw).validateReviewRegistrationContextV1(raw);
}

function canExportAggregateReport(args) {
  return testReviewGateForRaw(args?.evidence?.rawReviewEvidence).canExportAggregateReport(args);
}

function validateAggregatePublicationConsistencyV1(args) {
  return testReviewGateForRaw(args?.evidence?.rawReviewEvidence)
    .validateAggregatePublicationConsistencyV1(args);
}

function seal(artifact, field) {
  artifact[field] = calculateArtifactHash(artifact, field);
  return artifact;
}

function canonicalHash(value) {
  return sha256Hex(canonicalJson(value));
}

function protectedReviewInputRoot(raw) {
  return calculateProtectedReviewInputRootV1(
    raw,
    trustedAuthorizationRootsFor(raw),
    LINEAGE_RULE_APPROVAL_HASH,
  );
}

function trustedAuthorizationRootsFor(raw) {
  const qwenAuthorization = raw?.executionEvidence?.referenceExecutionBundle?.authorization;
  const deepSeekAuthorization = raw?.executionEvidence?.deepSeekAuthorization;
  const routeProbeAuthorization = raw?.executionEvidence?.routeProbeAuthorization
    ?? raw?.routeProbeAuthorization;
  return {
    qwen: {
      authorizationHash: qwenAuthorization?.authorizationHash,
      priceSnapshotHash: qwenAuthorization?.priceSnapshotHash
        ?? qwenAuthorization?.priceSnapshot?.priceSnapshotHash,
      ownerGrantRootHash: qwenAuthorization?.ownerGrantRootHash
        ?? qwenAuthorization?.ownerGrantHash,
    },
    deepSeek: {
      authorizationHash: deepSeekAuthorization?.authorizationHash,
      priceSnapshotHash: deepSeekAuthorization?.priceSnapshotHash
        ?? deepSeekAuthorization?.priceSnapshot?.priceSnapshotHash,
      ownerGrantRootHash: deepSeekAuthorization?.ownerGrantRootHash
        ?? deepSeekAuthorization?.ownerGrantHash,
    },
    routeProbe: {
      authorizationHash: routeProbeAuthorization?.authorizationHash,
      ownerGrantRootHash: routeProbeAuthorization?.ownerGrantRootHash
        ?? routeProbeAuthorization?.ownerGrantHash,
    },
  };
}

function reviewEvidence(raw) {
  return {
    rawReviewEvidence: raw,
    trustedAuthorizationRoots: trustedAuthorizationRootsFor(raw),
    trustedLineageRuleApprovalHash: LINEAGE_RULE_APPROVAL_HASH,
  };
}

function frozenMetric(metric, index) {
  return {
    metric,
    status: "UNDERPOWERED",
    numerator: index,
    denominator: 60,
    pointEstimate: index / 60,
    oneSidedWilsonLcb95: 0,
    oneSidedWilsonUcb95: 1,
    twoSidedWilsonL95: 0,
    twoSidedWilsonU95: 1,
    conservativeLower: 0,
    conservativeUpper: 1,
  };
}

function artifact(schemaVersion, hashField, frozenAt = "2026-08-25T00:50:00.000Z") {
  return seal({
    schemaVersion,
    designId: "MAIS-NATURAL-CA60-V4",
    frozenAt,
    value: schemaVersion,
  }, hashField);
}

function addMinutes(timestamp, minutes) {
  return new Date(Date.parse(timestamp) + minutes * 60_000).toISOString();
}

function buildIndependentRuntimeSourceEnumerationRerun(raw, overrides = {}) {
  const protectedReceipt = raw.runtimeExtractionSnapshot.runtimeSourceEnumerationReceipt;
  return buildRuntimeSourceEnumerationReceiptV1({
    registrationHash: overrides.registrationHash ?? protectedReceipt.registrationHash,
    sourceCommit: overrides.sourceCommit ?? protectedReceipt.sourceCommit,
    runtimeConfigHash: overrides.runtimeConfigHash ?? protectedReceipt.runtimeConfigHash,
    runtimeConfigEvidenceHash: overrides.runtimeConfigEvidenceHash ?? protectedReceipt.runtimeConfigEvidenceHash,
    sourceParityEvidenceHash: overrides.sourceParityEvidenceHash ?? protectedReceipt.sourceParityEvidenceHash,
    sourceModuleManifestHash: overrides.sourceModuleManifestHash ?? protectedReceipt.sourceModuleManifestHash,
    extractorImplementationHash: overrides.extractorImplementationHash ?? protectedReceipt.extractorImplementationHash,
    extractorRunnerCommit: overrides.extractorRunnerCommit ?? protectedReceipt.extractorRunnerCommit,
    extractorRunnerHash: overrides.extractorRunnerHash ?? protectedReceipt.extractorRunnerHash,
    rawEvidenceArtifactRootHash: overrides.rawEvidenceArtifactRootHash ?? canonicalHash({
      purpose: "A11_INDEPENDENT_POST_EXECUTION_SOURCE_ENUMERATION_RAW_EVIDENCE",
      protectedSourceEnumerationReceiptHash: protectedReceipt.sourceEnumerationReceiptHash,
    }),
    enumeratedAt: overrides.enumeratedAt ?? addMinutes(raw.currentHeads.finalFinishedAt, 5),
    gradeProjectionInvocations: overrides.gradeProjectionInvocations ?? protectedReceipt.gradeProjectionInvocations.map(({ grade, itemLeaves }) => ({
      grade,
      itemLeaves: structuredClone(itemLeaves),
    })),
  });
}

function buildIndependentRecomputation(raw) {
  const executionEvidence = raw.executionEvidence;
  const observed = deriveObservedEvaluationLedger(raw.finalEvaluationBundle.itemResults);
  const counterfactual = deriveCounterfactualLedger(observed);
  const metrics = recomputeMetricSet(observed, counterfactual);
  const integrity = deriveExecutionIntegrity({
    ...observed.accounting,
    receiptChainValid: true,
    providerTupleValid: true,
    capsValid: true,
    terminalProviderFailure: false,
  });
  const decision = deriveOverallDecision({
    integrity,
    metrics,
    materialDeviation: false,
    postResultDesignDrift: false,
    labelLeakage: false,
    unauthorizedProviderCall: false,
  });
  const qwenAttempts = executionEvidence.referenceExecutionBundle.attemptChain;
  const deepSeekAttempts = executionEvidence.deepSeekAttemptChain;
  const c0 = recomputeA11C0ReviewEvidenceV4({
    registrationHash: executionEvidence.executionRegistration.registrationHash,
    sampleManifestHash: executionEvidence.executionRegistration.sampleManifestHash,
    executionRegistrationHash: executionEvidence.executionRegistration.executionRegistrationHash,
    sampleRows: executionEvidence.sampleManifestRows,
    registeredRandomAuditRows: executionEvidence.registeredRandomAuditRows,
    protectedItemBundles: executionEvidence.c0ProtectedItemBundles,
    sealedTriggerInputs: executionEvidence.c0TriggerInputs,
    sealedTriggerDecisions: executionEvidence.c0TriggerDecisions,
    sealedExecutionSet: executionEvidence.c0ExecutionSet,
    deepSeekSuccessfulCallCap: executionEvidence.deepSeekSuccessfulCallCap,
  }).result;
  return seal({
    schemaVersion: "IndependentRawRecomputationV1",
    designId: "MAIS-NATURAL-CA60-V4",
    registrationHash: raw.currentHeads.activeDesignRegistrationHash,
    executionRegistrationHash: raw.currentHeads.activeExecutionRegistrationHash,
    frameHash: raw.frameRegistration.samplingFrameHash,
    sampleHash: raw.sampleManifest.sampleManifestHash,
    recomputedRuntimeSourceEnumerationRootHash: raw.independentRuntimeSourceEnumerationReceipt.fullSourceEnumerationRootHash,
    independentSourceEnumerationReceiptHash: raw.independentRuntimeSourceEnumerationReceipt.sourceEnumerationReceiptHash,
    referenceSealHash: executionEvidence.referenceExecutionBundle.referenceSeal.sealHash,
    qwenAttemptChainHash: calculateProviderAttemptChainHash(qwenAttempts),
    deepSeekAttemptChainHash: calculateProviderAttemptChainHash(deepSeekAttempts),
    itemResultSetHash: observed.itemResultSetHash,
    observedLedgerHash: observed.observedLedgerHash,
    counterfactualLedgerHash: counterfactual.counterfactualLedgerHash,
    matchingHash: canonicalHash(observed.matchRecords),
    metricSetHash: canonicalHash(metrics),
    metricResults: metrics,
    matchingRecords: observed.matchRecords,
    totalAttemptCount: qwenAttempts.length + deepSeekAttempts.length,
    qwenAttemptCount: qwenAttempts.length,
    deepSeekAttemptCount: deepSeekAttempts.length,
    trustedAuthorizationRootSetHash: canonicalHash(trustedAuthorizationRootsFor(raw)),
    c0TriggerInputRootHash: c0.triggerInputRootHash,
    c0TriggerDecisionRootHash: c0.triggerDecisionRootHash,
    c0ExecutionSetHash: c0.executionSetHash,
    finalReceiptSummaryRootHash: raw.finalEvaluationBundle.finalReceipt.finalSummaryRootHash,
    decision,
  }, "recomputationHash");
}

function buildFullReviewContext({ missingReceiptCount = 0 } = {}) {
  const designRegistration = structuredClone(HYPOTHETICAL_FROZEN_DESIGN_REGISTRATION);
  const designComponentHashes = structuredClone(
    designRegistration.designComponentHashes ?? designRegistration.frozenContractHashes ?? {},
  );
  const frozenArtifacts = {
    threshold: artifact("ThresholdRegistrationV1", "thresholdHash", "2026-08-25T05:05:00.000Z"),
    taxonomy: artifact("TaxonomyRegistrationV1", "taxonomyHash", "2026-08-25T05:05:00.000Z"),
    labelSchema: artifact("LabelSchemaRegistrationV1", "labelSchemaHash", "2026-08-25T05:05:00.000Z"),
    adjudicationMethod: artifact("AdjudicationMethodRegistrationV1", "adjudicationMethodHash", "2026-08-25T05:05:00.000Z"),
    severityRule: artifact("SeverityRuleRegistrationV1", "severityRuleHash", "2026-08-25T05:05:00.000Z"),
    promptSet: artifact("PromptSetRegistrationV1", "promptSetHash", "2026-08-25T05:05:00.000Z"),
    schemaSet: artifact("SchemaSetRegistrationV1", "schemaSetHash", "2026-08-25T05:05:00.000Z"),
    runner: seal({
      schemaVersion: "NaturalCaRunnerArtifactV4",
      designId: "MAIS-NATURAL-CA60-V4",
      registrationHash: designRegistration.registrationHash,
      frozenAt: "2026-08-25T05:05:00.000Z",
      implementationRootHash: sha256Hex("full-review-runner-implementation"),
    }, "runnerHash"),
    adapter: seal({
      schemaVersion: "NaturalCaAdapterArtifactV4",
      designId: "MAIS-NATURAL-CA60-V4",
      registrationHash: designRegistration.registrationHash,
      frozenAt: "2026-08-25T05:06:00.000Z",
      implementationRootHash: sha256Hex("full-review-adapter-implementation"),
    }, "adapterHash"),
    statisticalPower: artifact("StatisticalPowerRegistrationV1", "statisticalPowerHash", "2026-08-25T05:05:00.000Z"),
    designSupersedes: artifact("DesignSupersedesRegistrationV1", "designSupersedesHash", "2026-08-25T05:05:00.000Z"),
  };
  const sample = buildFullSampleContractFixture({
    registrationHash: designRegistration.registrationHash,
  });
  const execution = buildFullFinalExecutionFixture({
    sampleFixture: sample,
    authorizationBindings: {
      promptSetHash: frozenArtifacts.promptSet.promptSetHash,
      schemaSetHash: frozenArtifacts.schemaSet.schemaSetHash,
      designComponentHashes,
      runnerCommit: "c".repeat(40),
      runnerHash: frozenArtifacts.runner.runnerHash,
      adapterHash: frozenArtifacts.adapter.adapterHash,
    },
    executionRegistrationBindings: {
      thresholdHash: frozenArtifacts.threshold.thresholdHash,
      taxonomyHash: frozenArtifacts.taxonomy.taxonomyHash,
      labelSchemaHash: frozenArtifacts.labelSchema.labelSchemaHash,
      adjudicationMethodHash: frozenArtifacts.adjudicationMethod.adjudicationMethodHash,
      severityRuleHash: frozenArtifacts.severityRule.severityRuleHash,
      statisticalPowerHash: frozenArtifacts.statisticalPower.statisticalPowerHash,
      designSupersedesHash: frozenArtifacts.designSupersedes.designSupersedesHash,
      designComponentHashes,
    },
    missingReceiptCount,
  });
  const executionRegistration = execution.executionEvidence.executionRegistration;
  const reviewLedgerHead = seal({
    schemaVersion: "ReviewLedgerHeadV1",
    designId: "MAIS-NATURAL-CA60-V4",
    latestFinalEvaluationReceiptHash: execution.finalReceipt.receiptHash,
    previousReviewReceiptHash: null,
  }, "reviewLedgerHeadHash");
  const currentHeads = {
    activeDesignRegistrationHash: designRegistration.registrationHash,
    activeExecutionRegistrationHash: executionRegistration.executionRegistrationHash,
    latestFinalEvaluationReceiptHash: execution.finalReceipt.receiptHash,
    referenceSealHash: execution.executionEvidence.referenceExecutionBundle.referenceSeal.sealHash,
    frameRegistrationHash: sample.frameRegistration.frameRegistrationHash,
    sampleManifestHash: sample.sampleManifest.sampleManifestHash,
    thresholdHash: frozenArtifacts.threshold.thresholdHash,
    taxonomyHash: frozenArtifacts.taxonomy.taxonomyHash,
    labelSchemaHash: frozenArtifacts.labelSchema.labelSchemaHash,
    adjudicationMethodHash: frozenArtifacts.adjudicationMethod.adjudicationMethodHash,
    severityRuleHash: frozenArtifacts.severityRule.severityRuleHash,
    promptSetHash: frozenArtifacts.promptSet.promptSetHash,
    schemaSetHash: frozenArtifacts.schemaSet.schemaSetHash,
    runnerHash: frozenArtifacts.runner.runnerHash,
    adapterHash: frozenArtifacts.adapter.adapterHash,
    statisticalPowerHash: frozenArtifacts.statisticalPower.statisticalPowerHash,
    designSupersedesHash: frozenArtifacts.designSupersedes.designSupersedesHash,
    methodComponentRootSetHash: FROZEN_METHOD_COMPONENT_ROOTS_V4_HASH,
    reviewLedgerHeadHash: reviewLedgerHead.reviewLedgerHeadHash,
    finalFinishedAt: execution.finalReceipt.finalFinishedAt,
  };
  const routeProbeAuthorization = seal({
    schemaVersion: "DeepSeekRouteProbeAuthorizationV1",
    designId: "MAIS-NATURAL-CA60-V4",
    registrationHash: designRegistration.registrationHash,
    ownerGrantRootHash: sha256Hex("full-review-route-probe-owner-grant"),
  }, "authorizationHash");
  execution.executionEvidence.routeProbeAuthorization = routeProbeAuthorization;
  const raw = {
    currentHeads,
    designRegistration,
    executionRegistration,
    frameRegistration: sample.frameRegistration,
    sampleManifest: sample.sampleManifest,
    frozenArtifacts,
    finalEvaluationBundle: execution,
    executionEvidence: execution.executionEvidence,
    runnerArtifact: frozenArtifacts.runner,
    adapterArtifact: frozenArtifacts.adapter,
    qwenAuthorization: execution.executionEvidence.referenceExecutionBundle.authorization,
    referenceLabelSeal: execution.executionEvidence.referenceExecutionBundle.referenceSeal,
    deepSeekAuthorization: execution.executionEvidence.deepSeekAuthorization,
    routeProbeAuthorization,
    reviewLedgerHead,
    frameRows: sample.frameRows,
    runtimeExtractionSnapshot: sample.runtimeExtractionSnapshot,
    cleanSourceEvidence: sample.cleanSourceEvidence,
    clusterAudit: sample.clusterAudit,
    c0RandomAudit: sample.c0RandomAudit,
    mainScorerImplementationHash: sha256Hex("full-main-scorer"),
    mainScorerDependencyHash: sha256Hex("full-main-dependencies"),
  };
  raw.independentRuntimeSourceEnumerationReceipt = buildIndependentRuntimeSourceEnumerationRerun(raw);
  raw.independentRecomputation = buildIndependentRecomputation(raw);
  return raw;
}

const fullReviewContextCache = new Map();

function fullReviewContext(options = {}) {
  const missingReceiptCount = options.missingReceiptCount ?? 0;
  if (!fullReviewContextCache.has(missingReceiptCount)) {
    fullReviewContextCache.set(missingReceiptCount, buildFullReviewContext({ missingReceiptCount }));
  }
  return structuredClone(fullReviewContextCache.get(missingReceiptCount));
}

function buildContext() {
  const designRegistration = structuredClone(TEST_FIXTURE_ONLY_DESIGN_REGISTRATION);
  const designComponentHashes = structuredClone(
    designRegistration.designComponentHashes ?? designRegistration.frozenContractHashes ?? {},
  );
  const frameFrozenAt = addMinutes(designRegistration.frozenAt, 1);
  const sampleFrozenAt = addMinutes(designRegistration.frozenAt, 2);
  const runnerFrozenAt = addMinutes(designRegistration.frozenAt, 3);
  const adapterFrozenAt = addMinutes(designRegistration.frozenAt, 4);
  const qwenAuthorizedAt = addMinutes(designRegistration.frozenAt, 5);
  const referenceFrozenAt = addMinutes(designRegistration.frozenAt, 6);
  const deepSeekAuthorizedAt = addMinutes(designRegistration.frozenAt, 7);
  const executionFrozenAt = addMinutes(designRegistration.frozenAt, 8);
  const finalFinishedAt = addMinutes(designRegistration.frozenAt, 10);
  const frozenArtifacts = {
    threshold: artifact("ThresholdRegistrationV1", "thresholdHash", runnerFrozenAt),
    taxonomy: artifact("TaxonomyRegistrationV1", "taxonomyHash", runnerFrozenAt),
    labelSchema: artifact("LabelSchemaRegistrationV1", "labelSchemaHash", runnerFrozenAt),
    adjudicationMethod: artifact("AdjudicationMethodRegistrationV1", "adjudicationMethodHash", runnerFrozenAt),
    severityRule: artifact("SeverityRuleRegistrationV1", "severityRuleHash", runnerFrozenAt),
    promptSet: artifact("PromptSetRegistrationV1", "promptSetHash", runnerFrozenAt),
    schemaSet: artifact("SchemaSetRegistrationV1", "schemaSetHash", runnerFrozenAt),
    runner: seal({
      schemaVersion: "NaturalCaRunnerArtifactV4",
      designId: "MAIS-NATURAL-CA60-V4",
      registrationHash: designRegistration.registrationHash,
      frozenAt: runnerFrozenAt,
      implementationRootHash: sha256Hex("review-runner-implementation"),
    }, "runnerHash"),
    adapter: seal({
      schemaVersion: "NaturalCaAdapterArtifactV4",
      designId: "MAIS-NATURAL-CA60-V4",
      registrationHash: designRegistration.registrationHash,
      frozenAt: adapterFrozenAt,
      implementationRootHash: sha256Hex("review-adapter-implementation"),
    }, "adapterHash"),
    statisticalPower: artifact("StatisticalPowerRegistrationV1", "statisticalPowerHash", runnerFrozenAt),
    designSupersedes: artifact("DesignSupersedesRegistrationV1", "designSupersedesHash", runnerFrozenAt),
  };
  const frameRegistration = seal({
    schemaVersion: "FrameRegistrationV1",
    designId: "MAIS-NATURAL-CA60-V4",
    registrationHash: designRegistration.registrationHash,
    sourceCommit: SOURCE_COMMIT,
    runtimeConfigHash: RUNTIME_CONFIG_HASH,
    samplingFrameHash: sha256Hex("protected-frame"),
    frozenAt: frameFrozenAt,
  }, "frameRegistrationHash");
  const selectedRows = Array.from({ length: 60 }, (_, index) => ({
    itemId: `item-${String(index + 1).padStart(3, "0")}`,
    itemIdPseudonym: `item-pseudo-${String(index + 1).padStart(3, "0")}`,
    itemHash: sha256Hex(`item-${index + 1}`),
    clusterId: `cluster-${String(index + 1).padStart(3, "0")}`,
  }));
  const sampleManifest = seal({
    schemaVersion: "SampleManifestV2",
    designId: "MAIS-NATURAL-CA60-V4",
    registrationHash: designRegistration.registrationHash,
    frameRegistrationHash: frameRegistration.frameRegistrationHash,
    manifestFrozenAt: sampleFrozenAt,
    selectedRows,
    manifestTupleRootHash: canonicalHash(selectedRows.map(({ itemId, itemHash, clusterId }) => [itemId, itemHash, clusterId])),
  }, "sampleManifestHash");
  const c0RandomAudit = seal({
    schemaVersion: "C0RandomAuditSelectionV1",
    designId: "MAIS-NATURAL-CA60-V4",
    registrationHash: designRegistration.registrationHash,
    sampleManifestHash: sampleManifest.sampleManifestHash,
    frozenAt: addMinutes(designRegistration.frozenAt, 4),
    selectedRows: selectedRows.slice(0, 12),
  }, "auditHash");
  const authorizationBase = {
    schemaVersion: "ProviderAuthorizationV1",
    designId: "MAIS-NATURAL-CA60-V4",
    registrationHash: designRegistration.registrationHash,
    frameRegistrationHash: frameRegistration.frameRegistrationHash,
    sampleManifestHash: sampleManifest.sampleManifestHash,
    designComponentHashes,
    runnerHash: frozenArtifacts.runner.runnerHash,
    adapterHash: frozenArtifacts.adapter.adapterHash,
    priceSnapshotHash: sha256Hex("review-price-snapshot"),
    ownerGrantRootHash: sha256Hex("review-owner-grant"),
  };
  const qwenAuthorization = seal({
    ...authorizationBase,
    provider: "QWEN_MACHINE_REFERENCE",
    issuedAt: qwenAuthorizedAt,
  }, "authorizationHash");
  const referenceSeal = seal({
    schemaVersion: "ReferenceLabelSealV1",
    designId: "MAIS-NATURAL-CA60-V4",
    registrationHash: designRegistration.registrationHash,
    frameRegistrationHash: frameRegistration.frameRegistrationHash,
    sampleManifestHash: sampleManifest.sampleManifestHash,
    qwenAuthorizationHash: qwenAuthorization.authorizationHash,
    referenceLabelsFrozenAt: referenceFrozenAt,
    agreementStatistics: {
      rawLabelAgreement: 1,
      cohenKappa: null,
      gwetAc1: 1,
      meanCodeJaccard: 1,
      meanFamilyJaccard: 1,
      severityAgreement: 1,
      adjudicationRate: 0,
      interpretation: "CORRELATED_SAME_MODEL_MACHINE_PANEL_AGREEMENT_ONLY_NOT_HUMAN_VALIDITY",
    },
    adjudicationSuccessfulCallCount: 0,
    adjudicationRate: 0,
  }, "sealHash");
  const referenceExecutionBundle = { authorization: qwenAuthorization, referenceSeal, attemptChain: [] };
  const deepSeekAuthorization = seal({
    ...authorizationBase,
    provider: "DEEPSEEK_EVALUATION",
    referenceSealHash: referenceSeal.sealHash,
    issuedAt: deepSeekAuthorizedAt,
  }, "authorizationHash");
  const executionRegistration = seal({
    schemaVersion: "ExecutionRegistrationV1",
    designId: "MAIS-NATURAL-CA60-V4",
    registrationHash: designRegistration.registrationHash,
    frameRegistrationHash: frameRegistration.frameRegistrationHash,
    sampleManifestHash: sampleManifest.sampleManifestHash,
    qwenAuthorizationHash: qwenAuthorization.authorizationHash,
    referenceSealHash: referenceSeal.sealHash,
    deepSeekAuthorizationHash: deepSeekAuthorization.authorizationHash,
    designComponentHashes,
    runnerHash: frozenArtifacts.runner.runnerHash,
    adapterHash: frozenArtifacts.adapter.adapterHash,
    c0RandomAuditSelectionHash: c0RandomAudit.auditHash,
    frozenAt: executionFrozenAt,
  }, "executionRegistrationHash");
  const metricResults = FROZEN_METRIC_ORDER.map(frozenMetric);
  const finalReceipt = seal({
    schemaVersion: "FinalEvaluationReceiptV1",
    designId: "MAIS-NATURAL-CA60-V4",
    registrationHash: designRegistration.registrationHash,
    executionRegistrationHash: executionRegistration.executionRegistrationHash,
    frameRegistrationHash: frameRegistration.frameRegistrationHash,
    sampleManifestHash: sampleManifest.sampleManifestHash,
    referenceSealHash: referenceSeal.sealHash,
    metricResults,
    completeReceiptItemCount: 60,
    missingReceiptItemCount: 0,
    unresolvedReferenceItemCount: 0,
    invalidItemCount: 0,
    unifiedNonresolvedItemCount: 0,
    conclusion: "INCONCLUSIVE_MACHINE_REFERENCE",
    decisionCeiling: "INCONCLUSIVE_MACHINE_REFERENCE",
    claimScopeCeiling: "CALIFORNIA_RUNTIME_EGRESS_ELIGIBLE_MACHINE_REFERENCE_PILOT_ONLY",
    finalFinishedAt,
  }, "receiptHash");
  const reviewLedgerHead = seal({
    schemaVersion: "ReviewLedgerHeadV1",
    designId: "MAIS-NATURAL-CA60-V4",
    latestFinalEvaluationReceiptHash: finalReceipt.receiptHash,
    previousReviewReceiptHash: null,
  }, "reviewLedgerHeadHash");
  const executionEvidence = {
    referenceExecutionBundle,
    deepSeekAuthorization,
    deepSeekAuthorizationExpected: {},
    deepSeekAttemptChain: [],
    deepSeekItemBundles: [],
    deepSeekCompleteItemBundles: [],
    deepSeekMissingReceiptItemBundles: [],
    sampleManifestRows: selectedRows.map(({ itemIdPseudonym, itemHash, clusterId }) => ({ itemIdPseudonym, itemHash, clusterId })),
    registeredRandomAuditRows: selectedRows.slice(0, 12)
      .map(({ itemIdPseudonym, itemHash, clusterId }) => ({ itemIdPseudonym, itemHash, clusterId })),
    c0ProtectedItemBundles: [],
    c0TriggerInputs: [],
    c0TriggerDecisions: [],
    deepSeekSuccessfulCallCap: 420,
    c0ExecutionSet: {},
    executionRegistration,
    deviationEvidence: {},
  };
  const routeProbeAuthorization = seal({
    schemaVersion: "DeepSeekRouteProbeAuthorizationV1",
    designId: "MAIS-NATURAL-CA60-V4",
    registrationHash: designRegistration.registrationHash,
    ownerGrantRootHash: sha256Hex("review-route-probe-owner-grant"),
  }, "authorizationHash");
  executionEvidence.routeProbeAuthorization = routeProbeAuthorization;
  const currentHeads = {
    activeDesignRegistrationHash: designRegistration.registrationHash,
    activeExecutionRegistrationHash: executionRegistration.executionRegistrationHash,
    latestFinalEvaluationReceiptHash: finalReceipt.receiptHash,
    referenceSealHash: referenceSeal.sealHash,
    frameRegistrationHash: frameRegistration.frameRegistrationHash,
    sampleManifestHash: sampleManifest.sampleManifestHash,
    thresholdHash: frozenArtifacts.threshold.thresholdHash,
    taxonomyHash: frozenArtifacts.taxonomy.taxonomyHash,
    labelSchemaHash: frozenArtifacts.labelSchema.labelSchemaHash,
    adjudicationMethodHash: frozenArtifacts.adjudicationMethod.adjudicationMethodHash,
    severityRuleHash: frozenArtifacts.severityRule.severityRuleHash,
    promptSetHash: frozenArtifacts.promptSet.promptSetHash,
    schemaSetHash: frozenArtifacts.schemaSet.schemaSetHash,
    runnerHash: frozenArtifacts.runner.runnerHash,
    adapterHash: frozenArtifacts.adapter.adapterHash,
    statisticalPowerHash: frozenArtifacts.statisticalPower.statisticalPowerHash,
    designSupersedesHash: frozenArtifacts.designSupersedes.designSupersedesHash,
    methodComponentRootSetHash: FROZEN_METHOD_COMPONENT_ROOTS_V4_HASH,
    reviewLedgerHeadHash: reviewLedgerHead.reviewLedgerHeadHash,
    finalFinishedAt: finalReceipt.finalFinishedAt,
  };
  const raw = {
    currentHeads,
    designRegistration,
    executionRegistration,
    frameRegistration,
    sampleManifest,
    frozenArtifacts,
    finalEvaluationBundle: { finalReceipt, itemResults: [], counterfactualLedger: {}, metricInputs: {}, executionEvidence },
    executionEvidence,
    runnerArtifact: frozenArtifacts.runner,
    adapterArtifact: frozenArtifacts.adapter,
    qwenAuthorization,
    referenceLabelSeal: referenceSeal,
    deepSeekAuthorization,
    routeProbeAuthorization,
    reviewLedgerHead,
    frameRows: [],
    clusterAudit: {},
    c0RandomAudit,
    mainScorerImplementationHash: sha256Hex("main-scorer"),
    mainScorerDependencyHash: sha256Hex("main-dependencies"),
  };
  return raw;
}

function buildVerifierProof(sourceContent = 'import fs from "node:fs";\nexport const verify = () => fs.constants.F_OK;\n', raw = null) {
  const sourceFiles = [{
    path: "independent-verifier.mjs",
    content: sourceContent,
    sha256: sha256Hex(sourceContent),
  }];
  const verifierSourceTreeHash = canonicalHash(sourceFiles.map(({ path, sha256 }) => [path, sha256]));
  const lockContent = '{"lockfileVersion":3,"packages":{}}\n';
  const dependencyLock = { path: "package-lock.json", content: lockContent, sha256: sha256Hex(lockContent) };
  const dependencyLockHash = canonicalHash([dependencyLock.path, dependencyLock.sha256]);
  const importGraph = sourceContent.includes("node:fs")
    ? [{ from: "independent-verifier.mjs", specifier: "node:fs" }]
    : [];
  const importGraphHash = canonicalHash(importGraph);
  const forbiddenScorerFindings = [];
  const forbiddenScorerScanHash = canonicalHash({
    sourceTreeHash: verifierSourceTreeHash,
    patterns: [...FORBIDDEN_INDEPENDENT_VERIFIER_IMPORT_PATTERNS],
    findings: forbiddenScorerFindings,
  });
  const inputEvidenceRootHash = raw ? protectedReviewInputRoot(raw) : sha256Hex("sealed-raw-fixture");
  const resultArtifactHash = raw?.independentRecomputation?.recomputationHash ?? sha256Hex("independent-verifier-result");
  const verificationCommand = {
    argv: ["node", "independent-verifier.mjs", "--verify-independent"],
    cwdHash: sha256Hex("clean-a11-worktree"),
    inputEvidenceRootHash,
    resultArtifactHash,
    exitCode: 0,
    stdoutHash: sha256Hex("verification-ok"),
    stderrHash: sha256Hex(""),
  };
  const runtime = { engine: "node", version: "v24.0.0", platform: "darwin", arch: "arm64" };
  const baselineProof = {
    sourceCommit: "1".repeat(40),
    worktreeClean: true,
    sourceTreeHash: verifierSourceTreeHash,
    fixtureRootHash: inputEvidenceRootHash,
    ...(raw ? {
      mainScorerImplementationHash: raw.mainScorerImplementationHash,
      mainScorerDependencyHash: raw.mainScorerDependencyHash,
      activeDesignRegistrationHash: raw.currentHeads.activeDesignRegistrationHash,
      activeExecutionRegistrationHash: raw.currentHeads.activeExecutionRegistrationHash,
      latestFinalEvaluationReceiptHash: raw.currentHeads.latestFinalEvaluationReceiptHash,
      trustedAuthorizationRootSetHash: canonicalHash(trustedAuthorizationRootsFor(raw)),
    } : {}),
  };
  return seal({
    schemaVersion: "IndependentVerifierProofV1",
    designId: "MAIS-NATURAL-CA60-V4",
    sourceFiles,
    verifierSourceTreeHash,
    dependencyLock,
    dependencyLockHash,
    importGraph,
    importGraphHash,
    forbiddenScorerPatterns: [...FORBIDDEN_INDEPENDENT_VERIFIER_IMPORT_PATTERNS],
    forbiddenScorerFindings,
    forbiddenScorerScanHash,
    verificationCommand,
    verificationCommandHash: canonicalHash(verificationCommand),
    runtime,
    runtimeHash: canonicalHash(runtime),
    baselineProof,
    baselineProofHash: canonicalHash(baselineProof),
  }, "proofHash");
}

function buildA11(raw, status = "UNREVIEWABLE") {
  const proof = buildVerifierProof(undefined, raw);
  raw.verifierIndependenceProof = proof;
  const recomputation = raw.independentRecomputation;
  const receipt = {
    schemaVersion: "IndependentReviewReceiptV1",
    designId: "MAIS-NATURAL-CA60-V4",
    reviewerLane: "A11",
    reviewerPseudonym: "a11-independent-verifier",
    provenanceType: "A11_INDEPENDENT_RECOMPUTATION",
    humanReferenceClaimAllowed: false,
    sourceArtifactsReadOnly: true,
    mainScorerImported: false,
    independenceAttestation: "PROCESS_ATTESTATION_NOT_MACHINE_PROOF",
    mainScorerImplementationHash: raw.mainScorerImplementationHash,
    mainScorerDependencyHash: raw.mainScorerDependencyHash,
    verifierProofHash: proof.proofHash,
    recomputationImplementationHash: proof.verifierSourceTreeHash,
    recomputationDependencyHash: proof.dependencyLockHash,
    recomputationImportGraphHash: proof.importGraphHash,
    forbiddenScorerScanHash: proof.forbiddenScorerScanHash,
    verificationCommandHash: proof.verificationCommandHash,
    verificationRuntimeHash: proof.runtimeHash,
    verificationBaselineProofHash: proof.baselineProofHash,
    reviewedItems: raw.sampleManifest.selectedRows.map(({ itemId, itemHash, clusterId }) => ({ itemId, itemHash, clusterId })),
    reviewedItemCount: 60,
    reviewedAttemptCount: recomputation?.totalAttemptCount ?? 0,
    reviewStatus: status,
    discrepancyCodes: status === "CONCURRED" ? [] : [status === "DISCREPANCY" ? "RAW_RECOMPUTATION_MISMATCH" : "PROTECTED_EXECUTION_EVIDENCE_UNAVAILABLE"],
    unreviewableReason: status === "UNREVIEWABLE" ? "The complete protected provider evidence is unavailable to the verifier." : null,
    reviewedAt: addMinutes(raw.currentHeads.finalFinishedAt, 10),
    previousReceiptHash: raw.currentHeads.reviewLedgerHeadHash,
  };
  if (recomputation) Object.assign(receipt, {
    recomputedFrameHash: recomputation.frameHash,
    recomputedSampleHash: recomputation.sampleHash,
    recomputedRuntimeSourceEnumerationRootHash: recomputation.recomputedRuntimeSourceEnumerationRootHash,
    independentSourceEnumerationReceiptHash: recomputation.independentSourceEnumerationReceiptHash,
    recomputedReferenceSealHash: recomputation.referenceSealHash,
    recomputedQwenAttemptChainHash: recomputation.qwenAttemptChainHash,
    recomputedDeepSeekAttemptChainHash: recomputation.deepSeekAttemptChainHash,
    recomputedItemResultSetHash: recomputation.itemResultSetHash,
    recomputedObservedLedgerHash: recomputation.observedLedgerHash,
    recomputedCounterfactualLedgerHash: recomputation.counterfactualLedgerHash,
    recomputedMatchingHash: recomputation.matchingHash,
    recomputedMetricSetHash: recomputation.metricSetHash,
    trustedAuthorizationRootSetHash: recomputation.trustedAuthorizationRootSetHash,
    recomputedC0TriggerInputRootHash: recomputation.c0TriggerInputRootHash,
    recomputedC0TriggerDecisionRootHash: recomputation.c0TriggerDecisionRootHash,
    recomputedC0ExecutionSetHash: recomputation.c0ExecutionSetHash,
    recomputedFinalReceiptSummaryRootHash: recomputation.finalReceiptSummaryRootHash,
    recomputedDecision: recomputation.decision,
  });
  for (const field of TRUSTED_CONTEXT_FIELDS) receipt[field] = raw.currentHeads[field];
  return seal(receipt, "receiptHash");
}

function buildA18(raw, independentReviewReceipt) {
  const methodReviewEvidence = seal({
    schemaVersion: "A18MethodReviewEvidenceV1",
    designId: "MAIS-NATURAL-CA60-V4",
    taxonomyHash: raw.currentHeads.taxonomyHash,
    labelSchemaHash: raw.currentHeads.labelSchemaHash,
    adjudicationMethodHash: raw.currentHeads.adjudicationMethodHash,
    severityRuleHash: raw.currentHeads.severityRuleHash,
    methodComponentRootSetHash: FROZEN_METHOD_COMPONENT_ROOTS_V4_HASH,
    publicLimitationSetHash: PUBLIC_LIMITATION_SET_HASH,
    publicClaimTemplateHash: PUBLIC_CLAIM_TEMPLATE_HASH,
    finalEvaluationReceiptHash: raw.currentHeads.latestFinalEvaluationReceiptHash,
  }, "methodReviewEvidenceHash");
  return seal({
    schemaVersion: "ClaimBoundaryReviewReceiptV1",
    designId: "MAIS-NATURAL-CA60-V4",
    registrationHash: raw.currentHeads.activeDesignRegistrationHash,
    executionRegistrationHash: raw.currentHeads.activeExecutionRegistrationHash,
    finalEvaluationReceiptHash: raw.currentHeads.latestFinalEvaluationReceiptHash,
    referenceSealHash: raw.currentHeads.referenceSealHash,
    frameRegistrationHash: raw.currentHeads.frameRegistrationHash,
    sampleManifestHash: raw.currentHeads.sampleManifestHash,
    thresholdHash: raw.currentHeads.thresholdHash,
    taxonomyHash: raw.currentHeads.taxonomyHash,
    labelSchemaHash: raw.currentHeads.labelSchemaHash,
    adjudicationMethodHash: raw.currentHeads.adjudicationMethodHash,
    severityRuleHash: raw.currentHeads.severityRuleHash,
    methodComponentRootSetHash: FROZEN_METHOD_COMPONENT_ROOTS_V4_HASH,
    publicLimitationSetHash: PUBLIC_LIMITATION_SET_HASH,
    publicClaimTemplateHash: PUBLIC_CLAIM_TEMPLATE_HASH,
    independentReviewReceiptHash: independentReviewReceipt.receiptHash,
    reviewLedgerHeadHash: independentReviewReceipt.receiptHash,
    reviewerLane: "A18",
    provenanceType: "A18_METHOD_AND_CLAIM_BOUNDARY_REVIEW",
    reviewScope: "TAXONOMY_ADJUDICATION_SEVERITY_AND_CLAIM_WORDING_ONLY",
    humanGoldLabelReview: false,
    sourceArtifactsReadOnly: true,
    reviewedDecision: raw.finalEvaluationBundle.finalReceipt.conclusion,
    reviewedClaimScopeCeiling: raw.finalEvaluationBundle.finalReceipt.claimScopeCeiling,
    methodReviewEvidence,
    claimBoundaryStatus: "NO_OBJECTION",
    objectionCodes: [],
    objectionReason: null,
    reviewedAt: addMinutes(independentReviewReceipt.reviewedAt, 10),
    previousReceiptHash: independentReviewReceipt.receiptHash,
  }, "receiptHash");
}

function publicMetricProjection(metric) {
  const fields = [
    "metric", "status", "numerator", "denominator", "pointEstimate",
    "oneSidedWilsonLcb95", "oneSidedWilsonUcb95", "twoSidedWilsonL95",
    "twoSidedWilsonU95", "conservativeLower", "conservativeUpper",
  ];
  return Object.fromEntries(fields.map((field) => [field, Object.hasOwn(metric, field) ? metric[field] : null]));
}

function buildReport(raw, a11, a18) {
  const final = raw.finalEvaluationBundle.finalReceipt;
  const agreement = raw.executionEvidence.referenceExecutionBundle.referenceSeal.agreementStatistics;
  return seal({
    schemaVersion: "PublicAggregateReportV1",
    designId: "MAIS-NATURAL-CA60-V4",
    registrationHash: raw.currentHeads.activeDesignRegistrationHash,
    finalEvaluationReceiptHash: raw.currentHeads.latestFinalEvaluationReceiptHash,
    independentReviewReceiptHash: a11.receiptHash,
    claimBoundaryReviewReceiptHash: a18.receiptHash,
    contentClass: "AGGREGATE_STATISTICS_HASHES_AND_LIMITATIONS_ONLY",
    conclusion: final.conclusion,
    decisionCeiling: final.decisionCeiling,
    claimScopeCeiling: final.claimScopeCeiling,
    aggregateStatistics: {
      sampledClusterCount: raw.sampleManifest.selectedRows.length,
      completedItemCount: final.completeReceiptItemCount,
      missingItemCount: final.missingReceiptItemCount,
      unresolvedReferenceItemCount: final.unresolvedReferenceItemCount,
      invalidItemCount: final.invalidItemCount,
      qwenAttemptCount: raw.executionEvidence.referenceExecutionBundle.attemptChain.length,
      deepSeekAttemptCount: raw.executionEvidence.deepSeekAttemptChain.length,
      totalAttemptCount: raw.executionEvidence.referenceExecutionBundle.attemptChain.length
        + raw.executionEvidence.deepSeekAttemptChain.length,
      metricResults: final.metricResults.map(publicMetricProjection),
      referenceAgreement: {
        rawLabelAgreement: agreement.rawLabelAgreement,
        cohenKappa: agreement.cohenKappa,
        gwetAc1: agreement.gwetAc1,
        meanCodeJaccard: agreement.meanCodeJaccard,
        meanFamilyJaccard: agreement.meanFamilyJaccard,
        severityAgreement: agreement.severityAgreement,
        adjudicationRate: agreement.adjudicationRate,
        interpretation: agreement.interpretation,
      },
    },
    artifactHashes: Object.fromEntries(TRUSTED_CONTEXT_FIELDS.filter((field) => field !== "finalFinishedAt")
      .map((field) => [field, raw.currentHeads[field]])),
    limitations: structuredClone(FROZEN_PUBLIC_LIMITATIONS),
  }, "reportHash");
}

test("test-only trusted V4 context accepts the sealed design plus later self-hashed runner, adapter, and stage chain", () => {
  const raw = buildContext();
  assert.deepEqual(validateReviewRegistrationContextV1(raw), []);
  assert.notDeepEqual(productionValidateReviewRegistrationContextV1(raw), []);
});

test("trusted V4 context rejects a current runner root not backed by the later runner artifact", () => {
  const raw = buildContext();
  raw.currentHeads.runnerHash = sha256Hex("forged-runner-root");
  assert.equal(validateReviewRegistrationContextV1(raw)
    .some((error) => error.includes("current trusted head runnerHash")), true);
});

test("trusted V4 context rejects an execution registration that substitutes a design component root", () => {
  const raw = buildContext();
  raw.executionRegistration.designComponentHashes.taxonomyHash = sha256Hex("stale-taxonomy");
  seal(raw.executionRegistration, "executionRegistrationHash");
  assert.equal(validateReviewRegistrationContextV1(raw)
    .some((error) => error.includes("execution registration design component hashes")), true);
});

test("trusted V4 context permits runner freeze after design but rejects runner freeze after Qwen authorization", () => {
  const raw = buildContext();
  raw.runnerArtifact.frozenAt = addMinutes(raw.qwenAuthorization.issuedAt, 1);
  seal(raw.runnerArtifact, "runnerHash");
  raw.currentHeads.runnerHash = raw.runnerArtifact.runnerHash;
  assert.equal(validateReviewRegistrationContextV1(raw)
    .some((error) => error.includes("later runner artifact must be frozen before Qwen authorization")), true);
});

test("trusted V4 context rejects sample freeze after Qwen authorization", () => {
  const raw = buildContext();
  raw.sampleManifest.manifestFrozenAt = addMinutes(raw.qwenAuthorization.issuedAt, 1);
  seal(raw.sampleManifest, "sampleManifestHash");
  const errors = validateReviewRegistrationContextV1(raw);
  assert.equal(errors.some((error) => error.includes("registration chronology")), true);
});

test("independent verifier proof binds source tree, lock, parsed import graph, command, runtime, and clean baseline", () => {
  assert.deepEqual(validateVerifierIndependenceProofV1(buildVerifierProof()), []);
});

test("independent verifier command must bind its complete raw input root and result artifact", () => {
  const proof = buildVerifierProof();
  delete proof.verificationCommand.inputEvidenceRootHash;
  delete proof.verificationCommand.resultArtifactHash;
  proof.verificationCommandHash = canonicalHash(proof.verificationCommand);
  seal(proof, "proofHash");
  assert.equal(validateVerifierIndependenceProofV1(proof).some((error) => error.includes("input and result artifact roots")), true);
});

test("independent verifier command entrypoint must be inside the sealed source tree", () => {
  const proof = buildVerifierProof();
  proof.verificationCommand.argv[1] = "unsealed-verifier.mjs";
  proof.verificationCommandHash = canonicalHash(proof.verificationCommand);
  seal(proof, "proofHash");
  assert.equal(validateVerifierIndependenceProofV1(proof).some((error) => error.includes("sealed source-tree entrypoint")), true);
});

test("independent verifier baseline source root must equal the recomputed source tree", () => {
  const proof = buildVerifierProof();
  proof.baselineProof.sourceTreeHash = sha256Hex("different-source-tree");
  proof.baselineProofHash = canonicalHash(proof.baselineProof);
  seal(proof, "proofHash");
  assert.equal(validateVerifierIndependenceProofV1(proof).some((error) => error.includes("baseline source-tree root mismatch")), true);
});

test("independent verifier proof rejects a forbidden main-scorer import even when rehashed", () => {
  const proof = buildVerifierProof('import { recomputeMetricSet } from "./design-contract.mjs";\n');
  assert.equal(validateVerifierIndependenceProofV1(proof).some((error) => error.includes("forbidden main-scorer")), true);
});

test("independent verifier proof rejects lockfile bytes that no longer match the lock hash", () => {
  const proof = buildVerifierProof();
  proof.dependencyLock.content += "tampered";
  seal(proof, "proofHash");
  assert.equal(validateVerifierIndependenceProofV1(proof).some((error) => error.includes("dependency-lock")), true);
});

test("independent verifier proof rejects a failed command and dirty baseline", () => {
  const proof = buildVerifierProof();
  proof.verificationCommand.exitCode = 1;
  proof.verificationCommandHash = canonicalHash(proof.verificationCommand);
  proof.baselineProof.worktreeClean = false;
  proof.baselineProofHash = canonicalHash(proof.baselineProof);
  seal(proof, "proofHash");
  const errors = validateVerifierIndependenceProofV1(proof);
  assert.equal(errors.some((error) => error.includes("command proof")), true);
  assert.equal(errors.some((error) => error.includes("clean-baseline")), true);
});

test("a structurally valid UNREVIEWABLE receipt still rejects a verifier proof for different raw input", () => {
  const raw = buildContext();
  const receipt = buildA11(raw, "UNREVIEWABLE");
  raw.verifierIndependenceProof.verificationCommand.inputEvidenceRootHash = sha256Hex("different-protected-input");
  raw.verifierIndependenceProof.verificationCommandHash = canonicalHash(raw.verifierIndependenceProof.verificationCommand);
  seal(raw.verifierIndependenceProof, "proofHash");
  receipt.verifierProofHash = raw.verifierIndependenceProof.proofHash;
  receipt.verificationCommandHash = raw.verifierIndependenceProof.verificationCommandHash;
  seal(receipt, "receiptHash");
  assert.equal(validateIndependentReviewReceiptV1(receipt, reviewEvidence(raw))
    .some((error) => error.includes("input evidence root binding mismatch")), true);
});

test("summary-only hashes can never form A11 concurrence", () => {
  const receipt = seal({
    schemaVersion: "IndependentReviewReceiptV1",
    designId: "MAIS-NATURAL-CA60-V4",
    reviewerLane: "A11",
    provenanceType: "A11_INDEPENDENT_RECOMPUTATION",
    humanReferenceClaimAllowed: false,
    sourceArtifactsReadOnly: true,
    mainScorerImported: false,
    independenceAttestation: "PROCESS_ATTESTATION_NOT_MACHINE_PROOF",
    reviewStatus: "CONCURRED",
    discrepancyCodes: [],
    unreviewableReason: null,
  }, "receiptHash");
  const errors = validateIndependentReviewReceiptV1(receipt, {});
  assert.equal(errors.some((error) => error.includes("complete protected raw review evidence")), true);
  assert.equal(errors.some((error) => error.includes("exactly 11 frozen metrics")), true);
});

test("valid UNREVIEWABLE receipt records unavailable evidence and still blocks export", () => {
  const raw = buildContext();
  const a11 = buildA11(raw, "UNREVIEWABLE");
  assert.deepEqual(validateIndependentReviewReceiptV1(a11, reviewEvidence(raw)), []);
  assert.equal(a11.reviewStatus, "UNREVIEWABLE");
});

test("CONCURRED invokes full raw validators and rejects an empty DeepSeek execution bundle", () => {
  const raw = buildContext();
  const a11 = buildA11(raw, "CONCURRED");
  const errors = validateIndependentReviewReceiptV1(a11, reviewEvidence(raw));
  assert.equal(errors.some((error) => error.includes("DeepSeek raw-leaf recomputation")), true);
  assert.equal(errors.some((error) => error.includes("exactly 11 frozen metrics")), true);
});

test("the shared Qwen240 plus DeepSeek180 fixture passes the complete upstream raw final validator", () => {
  const full = buildFullFinalExecutionFixture();
  assert.deepEqual(validateFinalEvaluationBundle(full), []);
  assert.equal(full.executionEvidence.referenceExecutionBundle.attemptChain.length, 240);
  assert.equal(full.executionEvidence.deepSeekAttemptChain.length, 180);
  assert.equal(full.executionEvidence.deepSeekItemBundles.length, 60);
});

test("A11 receipt rejects a verifier root reused from the main scorer", () => {
  const raw = buildContext();
  const a11 = buildA11(raw, "UNREVIEWABLE");
  raw.mainScorerImplementationHash = a11.recomputationImplementationHash;
  a11.mainScorerImplementationHash = raw.mainScorerImplementationHash;
  seal(a11, "receiptHash");
  assert.equal(validateIndependentReviewReceiptV1(a11, reviewEvidence(raw))
    .some((error) => error.includes("distinct from the main scorer")), true);
});

test("A18 no-objection binds exact method roots, current A11 head, and review chronology", () => {
  const raw = buildContext();
  const a11 = buildA11(raw, "CONCURRED");
  const a18 = buildA18(raw, a11);
  assert.deepEqual(validateClaimBoundaryReviewReceiptShapeAndEvidenceV1(a18, reviewEvidence(raw), a11), []);
});

test("A18 rejects a stale taxonomy root", () => {
  const raw = buildContext();
  const a11 = buildA11(raw, "CONCURRED");
  const a18 = buildA18(raw, a11);
  a18.taxonomyHash = sha256Hex("stale-taxonomy");
  seal(a18, "receiptHash");
  assert.equal(validateClaimBoundaryReviewReceiptShapeAndEvidenceV1(a18, reviewEvidence(raw), a11)
    .some((error) => error.includes("taxonomyHash binding")), true);
});

test("A18 rejects a review timestamp before A11 and the final receipt", () => {
  const raw = buildContext();
  const a11 = buildA11(raw, "CONCURRED");
  const a18 = buildA18(raw, a11);
  a18.reviewedAt = new Date(Date.parse(raw.currentHeads.finalFinishedAt) - 60_000).toISOString();
  seal(a18, "receiptHash");
  assert.equal(validateClaimBoundaryReviewReceiptShapeAndEvidenceV1(a18, reviewEvidence(raw), a11)
    .some((error) => error.includes("timestamp")), true);
});

test("A18 rejects any review head other than the exact A11 CONCURRED receipt", () => {
  const raw = buildContext();
  const a11 = buildA11(raw, "CONCURRED");
  const a18 = buildA18(raw, a11);
  a18.previousReceiptHash = sha256Hex("wrong-review-head");
  seal(a18, "receiptHash");
  assert.equal(validateClaimBoundaryReviewReceiptShapeAndEvidenceV1(a18, reviewEvidence(raw), a11)
    .some((error) => error.includes("exact current A11")), true);
});

test("A18 V4 concurrence rejects the legacy reviewedClaimCeiling alias", () => {
  const raw = buildContext();
  const a11 = buildA11(raw, "CONCURRED");
  const a18 = buildA18(raw, a11);
  a18.reviewedClaimCeiling = a18.reviewedClaimScopeCeiling;
  delete a18.reviewedClaimScopeCeiling;
  seal(a18, "receiptHash");
  assert.equal(validateClaimBoundaryReviewReceiptShapeAndEvidenceV1(a18, reviewEvidence(raw), a11)
    .some((error) => error.includes("claim ceiling")), true);
});

test("public aggregate report accepts the exact nested allowlist and frozen limitations", () => {
  const raw = buildContext();
  const a11 = buildA11(raw, "CONCURRED");
  const a18 = buildA18(raw, a11);
  const report = buildReport(raw, a11, a18);
  assert.deepEqual(validatePublicAggregateReportShapeAndEvidence(report, {
    evidence: reviewEvidence(raw),
    independentReviewReceipt: a11,
    claimBoundaryReviewReceipt: a18,
  }), []);
});

test("V4 public export rejects the legacy claimCeiling alias", () => {
  const raw = buildContext();
  const a11 = buildA11(raw, "CONCURRED");
  const a18 = buildA18(raw, a11);
  const report = buildReport(raw, a11, a18);
  report.claimCeiling = report.claimScopeCeiling;
  delete report.claimScopeCeiling;
  seal(report, "reportHash");
  assert.equal(validatePublicAggregateReportShapeAndEvidence(report, {
    evidence: reviewEvidence(raw), independentReviewReceipt: a11, claimBoundaryReviewReceipt: a18,
  }).some((error) => error.includes("top-level fields") || error.includes("claim ceiling")), true);
});

test("public report rejects an extra nested metric field even when rehashed", () => {
  const raw = buildContext();
  const a11 = buildA11(raw, "CONCURRED");
  const a18 = buildA18(raw, a11);
  const report = buildReport(raw, a11, a18);
  report.aggregateStatistics.metricResults[0].rawProviderOutput = "hidden";
  seal(report, "reportHash");
  assert.equal(validatePublicAggregateReportShapeAndEvidence(report, {
    evidence: reviewEvidence(raw), independentReviewReceipt: a11, claimBoundaryReviewReceipt: a18,
  }).some((error) => error.includes("nested metric") || error.includes("private")), true);
});

test("public report rejects a changed or omitted frozen limitation template", () => {
  const raw = buildContext();
  const a11 = buildA11(raw, "CONCURRED");
  const a18 = buildA18(raw, a11);
  const report = buildReport(raw, a11, a18);
  report.limitations.pop();
  seal(report, "reportHash");
  assert.equal(validatePublicAggregateReportShapeAndEvidence(report, {
    evidence: reviewEvidence(raw), independentReviewReceipt: a11, claimBoundaryReviewReceipt: a18,
  }).some((error) => error.includes("frozen limitation")), true);
});

test("public report recursively rejects secrets, item text, and general validity claims", () => {
  const raw = buildContext();
  const a11 = buildA11(raw, "CONCURRED");
  const a18 = buildA18(raw, a11);
  const mutations = [
    (report) => { report.aggregateStatistics.metricResults[0].secret = "sk-not-real-12345678"; },
    (report) => { report.aggregateStatistics.referenceAgreement.questionText = "What is 2+2?"; },
    (report) => { report.aggregateStatistics.referenceAgreement.claim = "Machine QA is generally effective and production ready."; },
    (report) => { report.aggregateStatistics.referenceAgreement.claim = "这证明机器 QA 普遍有效。"; },
  ];
  for (const mutate of mutations) {
    const report = buildReport(raw, a11, a18);
    mutate(report);
    seal(report, "reportHash");
    assert.notDeepEqual(validatePublicAggregateReportShapeAndEvidence(report, {
      evidence: reviewEvidence(raw), independentReviewReceipt: a11, claimBoundaryReviewReceipt: a18,
    }), []);
  }
});

test("public report rejects a missing, reordered, or duplicated metric endpoint", () => {
  const raw = buildContext();
  const a11 = buildA11(raw, "CONCURRED");
  const a18 = buildA18(raw, a11);
  const report = buildReport(raw, a11, a18);
  report.aggregateStatistics.metricResults[1] = structuredClone(report.aggregateStatistics.metricResults[0]);
  seal(report, "reportHash");
  assert.equal(validatePublicAggregateReportShapeAndEvidence(report, {
    evidence: reviewEvidence(raw), independentReviewReceipt: a11, claimBoundaryReviewReceipt: a18,
  }).some((error) => error.includes("11-metric") || error.includes("nested metric")), true);
});

test("complete evidence is publication-consistent but export stays blocked without protected custody roots", () => {
  const raw = fullReviewContext();
  assert.deepEqual(validateReviewRegistrationContextV1(raw), []);
  const a11 = buildA11(raw, "CONCURRED");
  assert.deepEqual(validateIndependentReviewReceiptV1(a11, reviewEvidence(raw)), []);
  assert.notDeepEqual(productionValidateIndependentReviewReceiptV1(a11, reviewEvidence(raw)), []);
  const a18 = buildA18(raw, a11);
  assert.deepEqual(validateClaimBoundaryReviewReceiptShapeAndEvidenceV1(a18, reviewEvidence(raw), a11), []);
  const report = buildReport(raw, a11, a18);
  assert.deepEqual(validatePublicAggregateReportShapeAndEvidence(report, {
    evidence: reviewEvidence(raw), independentReviewReceipt: a11, claimBoundaryReviewReceipt: a18,
  }), []);
  assert.equal(report.aggregateStatistics.qwenAttemptCount, 240);
  assert.equal(report.aggregateStatistics.deepSeekAttemptCount, 180);
  assert.equal(report.aggregateStatistics.totalAttemptCount, 420);
  const exportArguments = {
    evidence: reviewEvidence(raw), independentReviewReceipt: a11, claimBoundaryReviewReceipt: a18, report,
  };
  assert.deepEqual(validateAggregatePublicationConsistencyV1(exportArguments), []);
  assert.equal(canExportAggregateReport(exportArguments), false);
  assert.equal(TEST_FIXTURE_ONLY_REVIEW_GATE.canExportAggregateReport(exportArguments), false);
  assert.equal(productionCanExportAggregateReport(exportArguments), false,
    "workspace production export must remain closed without a protected execution-custody registry");
  assert.deepEqual(evaluateAggregatePublicationAuthorizationV1(), {
    schemaVersion: "AggregatePublicationAuthorizationStatusV1",
    allowed: false,
    status: "BLOCKED_PENDING_A21_PROTECTED_CUSTODY_REGISTRY",
    authorizationAvailable: false,
    callerSuppliedRootsAuthorized: false,
    blockerCodes: ["EXECUTION_CUSTODY_REGISTRY_NOT_IMPLEMENTED"],
    requiredCustodyArtifactSchema: "ProtectedExecutionCustodyRegistryV1",
    protectedRegistryRootHash: null,
    runnerHash: null,
  });
});

test("full A11 CONCURRED accepts 57-59 complete items plus the exact hash-bound missing-receipt partition", () => {
  for (const missingReceiptCount of [1, 2, 3]) {
    const raw = fullReviewContext({ missingReceiptCount });
    assert.deepEqual(validateReviewRegistrationContextV1(raw), [], `${60 - missingReceiptCount}/60 registration context`);
    const a11 = buildA11(raw, "CONCURRED");
    assert.deepEqual(
      validateIndependentReviewReceiptV1(a11, reviewEvidence(raw)),
      [],
      `${60 - missingReceiptCount}/60 A11 concurrence`,
    );
  }
});

test("A11 CONCURRED requires a distinct post-execution runtime source-enumeration rerun receipt", () => {
  const raw = fullReviewContext();
  const protectedReceipt = raw.runtimeExtractionSnapshot.runtimeSourceEnumerationReceipt;
  delete raw.independentRuntimeSourceEnumerationReceipt;
  raw.independentRecomputation.recomputedRuntimeSourceEnumerationRootHash = protectedReceipt.fullSourceEnumerationRootHash;
  raw.independentRecomputation.independentSourceEnumerationReceiptHash = protectedReceipt.sourceEnumerationReceiptHash;
  seal(raw.independentRecomputation, "recomputationHash");
  const a11 = buildA11(raw, "CONCURRED");
  const errors = validateIndependentReviewReceiptV1(a11, reviewEvidence(raw));
  assert.equal(errors.some((error) => error.includes("independent runtime source-enumeration rerun")), true);
  const a18 = buildA18(raw, a11);
  const report = buildReport(raw, a11, a18);
  assert.equal(canExportAggregateReport({
    evidence: reviewEvidence(raw),
    independentReviewReceipt: a11,
    claimBoundaryReviewReceipt: a18,
    report,
  }), false);
});

test("A11 CONCURRED rejects one independently rehashed grade invocation that differs from the frozen source enumeration", () => {
  const raw = fullReviewContext();
  const rerunInvocations = raw.independentRuntimeSourceEnumerationReceipt.gradeProjectionInvocations
    .map(({ grade, itemLeaves }) => ({ grade, itemLeaves: structuredClone(itemLeaves) }));
  rerunInvocations[0].itemLeaves[0].sourceItemHash = sha256Hex("independent-rerun-mutated-source-item");
  raw.independentRuntimeSourceEnumerationReceipt = buildIndependentRuntimeSourceEnumerationRerun(raw, {
    gradeProjectionInvocations: rerunInvocations,
  });
  const a11 = buildA11(raw, "CONCURRED");
  const errors = validateIndependentReviewReceiptV1(a11, reviewEvidence(raw));
  assert.equal(errors.some((error) => error.includes("13 grade invocation roots")), true);
});

test("A11 CONCURRED rejects a source-enumeration rerun against a stale source commit or runtime configuration", () => {
  const staleSourceRaw = fullReviewContext();
  staleSourceRaw.independentRuntimeSourceEnumerationReceipt = buildIndependentRuntimeSourceEnumerationRerun(
    staleSourceRaw,
    { sourceCommit: "b".repeat(40) },
  );
  const staleSourceReceipt = buildA11(staleSourceRaw, "CONCURRED");
  assert.equal(
    validateIndependentReviewReceiptV1(staleSourceReceipt, reviewEvidence(staleSourceRaw))
      .some((error) => error.includes("source/config/extractor tuple")),
    true,
  );

  const staleRuntimeRaw = fullReviewContext();
  const staleRuntimeConfigHash = sha256Hex("stale-independent-runtime-config");
  assert.throws(
    () => buildIndependentRuntimeSourceEnumerationRerun(staleRuntimeRaw, {
      runtimeConfigHash: staleRuntimeConfigHash,
    }),
    /runtimeConfigHash must equal the recomputed runtimeConfigEvidence root/u,
  );
  staleRuntimeRaw.independentRuntimeSourceEnumerationReceipt = buildIndependentRuntimeSourceEnumerationRerun(
    staleRuntimeRaw,
    {
      runtimeConfigHash: staleRuntimeConfigHash,
      runtimeConfigEvidenceHash: staleRuntimeConfigHash,
    },
  );
  const staleRuntimeReceipt = buildA11(staleRuntimeRaw, "CONCURRED");
  assert.equal(
    validateIndependentReviewReceiptV1(staleRuntimeReceipt, reviewEvidence(staleRuntimeRaw))
      .some((error) => error.includes("source/config/extractor tuple")),
    true,
  );
});

test("A11 CONCURRED requires every independently recomputed source-enumeration aggregate root to equal the frozen roots", () => {
  const raw = fullReviewContext();
  raw.independentRuntimeSourceEnumerationReceipt = buildIndependentRuntimeSourceEnumerationRerun(raw, {
    sourceCommit: "c".repeat(40),
  });
  const a11 = buildA11(raw, "CONCURRED");
  const errors = validateIndependentReviewReceiptV1(a11, reviewEvidence(raw));
  assert.equal(errors.some((error) => error.includes("expected/runtime/serialized/failure/source-exclusion/full root set")), true);
});

test("A11 CONCURRED rejects reuse of the original source-enumeration receipt as the claimed independent rerun", () => {
  const raw = fullReviewContext();
  raw.independentRuntimeSourceEnumerationReceipt = structuredClone(
    raw.runtimeExtractionSnapshot.runtimeSourceEnumerationReceipt,
  );
  const a11 = buildA11(raw, "CONCURRED");
  const errors = validateIndependentReviewReceiptV1(a11, reviewEvidence(raw));
  assert.equal(errors.some((error) => error.includes("distinct receipt and raw-evidence roots")), true);
});

test("A11 source rerun and review must occur in final-receipt then rerun then review order", () => {
  for (const enumeratedAt of [
    addMinutes(fullReviewContext().currentHeads.finalFinishedAt, -1),
    addMinutes(fullReviewContext().currentHeads.finalFinishedAt, 15),
  ]) {
    const raw = fullReviewContext();
    raw.independentRuntimeSourceEnumerationReceipt = buildIndependentRuntimeSourceEnumerationRerun(raw, { enumeratedAt });
    const a11 = buildA11(raw, "CONCURRED");
    const errors = validateIndependentReviewReceiptV1(a11, reviewEvidence(raw));
    assert.equal(errors.some((error) => error.includes("final-receipt then rerun then review chronology")), true);
  }
});

test("A11 recomputation artifact and receipt bind the independent source-enumeration receipt and recomputed root", () => {
  const raw = fullReviewContext();
  const a11 = buildA11(raw, "CONCURRED");
  assert.equal(
    raw.independentRecomputation.recomputedRuntimeSourceEnumerationRootHash,
    raw.independentRuntimeSourceEnumerationReceipt.fullSourceEnumerationRootHash,
  );
  assert.equal(
    raw.independentRecomputation.independentSourceEnumerationReceiptHash,
    raw.independentRuntimeSourceEnumerationReceipt.sourceEnumerationReceiptHash,
  );
  assert.equal(a11.recomputedRuntimeSourceEnumerationRootHash, raw.independentRecomputation.recomputedRuntimeSourceEnumerationRootHash);
  assert.equal(a11.independentSourceEnumerationReceiptHash, raw.independentRecomputation.independentSourceEnumerationReceiptHash);
  assert.deepEqual(validateIndependentReviewReceiptV1(a11, reviewEvidence(raw)), []);
});

test("full concurrence fails closed after a protected frame leaf or active root mutation", () => {
  const leafMutation = fullReviewContext();
  const leafReceipt = buildA11(leafMutation, "CONCURRED");
  leafMutation.frameRows[0].prompt += " tampered";
  assert.notDeepEqual(validateIndependentReviewReceiptV1(leafReceipt, reviewEvidence(leafMutation)), []);

  const rootMutation = fullReviewContext();
  const rootReceipt = buildA11(rootMutation, "CONCURRED");
  rootMutation.currentHeads.referenceSealHash = sha256Hex("forged-active-reference-root");
  assert.notDeepEqual(validateIndependentReviewReceiptV1(rootReceipt, reviewEvidence(rootMutation)), []);
});

test("A11 rejects a rehashed caller item result that differs from the result rebuilt from raw DeepSeek leaves", () => {
  const raw = fullReviewContext();
  const substituted = structuredClone(raw.finalEvaluationBundle.itemResults[0]);
  substituted.completedItemCommitMarkerHash = sha256Hex("caller-substituted-marker-root");
  seal(substituted, "itemResultHash");
  raw.finalEvaluationBundle.itemResults[0] = substituted;
  raw.independentRecomputation = buildIndependentRecomputation(raw);
  const a11 = buildA11(raw, "CONCURRED");
  assert.notDeepEqual(validateIndependentReviewReceiptV1(a11, reviewEvidence(raw)), []);
});

test("a structurally valid public report still cannot export without full A11 raw concurrence", () => {
  const raw = buildContext();
  const a11 = buildA11(raw, "CONCURRED");
  const a18 = buildA18(raw, a11);
  const report = buildReport(raw, a11, a18);
  assert.equal(canExportAggregateReport({
    evidence: reviewEvidence(raw),
    independentReviewReceipt: a11,
    claimBoundaryReviewReceipt: a18,
    report,
  }), false);
});

test("DISCREPANCY and UNREVIEWABLE review statuses always keep export closed", () => {
  for (const status of ["DISCREPANCY", "UNREVIEWABLE"]) {
    const raw = buildContext();
    const a11 = buildA11(raw, status);
    const pseudoConcurred = structuredClone(a11);
    pseudoConcurred.reviewStatus = "CONCURRED";
    pseudoConcurred.discrepancyCodes = [];
    pseudoConcurred.unreviewableReason = null;
    seal(pseudoConcurred, "receiptHash");
    const a18 = buildA18(raw, pseudoConcurred);
    const report = buildReport(raw, a11, a18);
    assert.equal(canExportAggregateReport({
      evidence: reviewEvidence(raw), independentReviewReceipt: a11, claimBoundaryReviewReceipt: a18, report,
    }), false, status);
  }
});
