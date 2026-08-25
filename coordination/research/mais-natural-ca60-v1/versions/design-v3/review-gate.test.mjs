import assert from "node:assert/strict";
import test from "node:test";

import {
  canExportAggregateReport,
  FORBIDDEN_INDEPENDENT_VERIFIER_IMPORT_PATTERNS,
  FROZEN_METRIC_ORDER,
  FROZEN_PUBLIC_LIMITATIONS,
  PUBLIC_CLAIM_TEMPLATE_HASH,
  PUBLIC_LIMITATION_SET_HASH,
  TRUSTED_CONTEXT_FIELDS,
  validateClaimBoundaryReviewReceiptV1,
  validateIndependentReviewReceiptV1,
  validatePublicAggregateReport,
  validateReviewRegistrationContextV1,
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
  recomputeMetricSet,
  sha256Hex,
  validateFinalEvaluationBundle,
} from "./design-contract.mjs";
import { buildRuntimeSourceEnumerationReceiptV1 } from "./sample-contract.mjs";
import { buildFullFinalExecutionFixture } from "./reference-global.test.mjs";
import { buildFullSampleContractFixture } from "./test-fixtures.mjs";

function seal(artifact, field) {
  artifact[field] = calculateArtifactHash(artifact, field);
  return artifact;
}

function canonicalHash(value) {
  return sha256Hex(canonicalJson(value));
}

function protectedReviewInputRoot(raw) {
  const finalBundle = raw.finalEvaluationBundle ?? {};
  return canonicalHash({
    schemaVersion: "ProtectedReviewInputRootV1",
    designId: "MAIS-NATURAL-CA60-V3",
    currentHeads: raw.currentHeads,
    designRegistration: raw.designRegistration,
    executionRegistration: raw.executionRegistration,
    frozenArtifacts: raw.frozenArtifacts,
    frameRows: raw.frameRows,
    runtimeExtractionSnapshot: raw.runtimeExtractionSnapshot ?? null,
    independentRuntimeSourceEnumerationReceipt: raw.independentRuntimeSourceEnumerationReceipt ?? null,
    cleanSourceEvidence: raw.cleanSourceEvidence ?? null,
    clusterAudit: raw.clusterAudit,
    frameRegistration: raw.frameRegistration,
    sampleManifest: raw.sampleManifest,
    c0RandomAudit: raw.c0RandomAudit,
    executionEvidence: raw.executionEvidence,
    finalEvaluationBundle: {
      finalReceipt: finalBundle.finalReceipt,
      itemResults: finalBundle.itemResults,
      counterfactualLedger: finalBundle.counterfactualLedger,
      metricInputs: finalBundle.metricInputs,
    },
    reviewLedgerHead: raw.reviewLedgerHead,
    mainScorerImplementationHash: raw.mainScorerImplementationHash,
    mainScorerDependencyHash: raw.mainScorerDependencyHash,
  });
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
    designId: "MAIS-NATURAL-CA60-V3",
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
  return seal({
    schemaVersion: "IndependentRawRecomputationV1",
    designId: "MAIS-NATURAL-CA60-V3",
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
    decision,
  }, "recomputationHash");
}

function buildFullReviewContext() {
  const frozenArtifacts = {
    threshold: artifact("ThresholdRegistrationV1", "thresholdHash"),
    taxonomy: artifact("TaxonomyRegistrationV1", "taxonomyHash"),
    labelSchema: artifact("LabelSchemaRegistrationV1", "labelSchemaHash"),
    adjudicationMethod: artifact("AdjudicationMethodRegistrationV1", "adjudicationMethodHash"),
    severityRule: artifact("SeverityRuleRegistrationV1", "severityRuleHash"),
    promptSet: artifact("PromptSetRegistrationV1", "promptSetHash"),
    schemaSet: artifact("SchemaSetRegistrationV1", "schemaSetHash"),
    runner: artifact("RunnerRegistrationV1", "runnerHash"),
    adapter: artifact("AdapterRegistrationV1", "adapterHash"),
    statisticalPower: artifact("StatisticalPowerRegistrationV1", "statisticalPowerHash"),
    designSupersedes: artifact("DesignSupersedesRegistrationV1", "designSupersedesHash"),
  };
  const designRegistration = seal({
    schemaVersion: "NaturalCaPilotDesignRegistrationV3",
    designId: "MAIS-NATURAL-CA60-V3",
    frozenAt: "2026-08-25T01:00:00.000Z",
    supersedes: "DESIGN_V2",
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
  }, "registrationHash");
  const sample = buildFullSampleContractFixture({
    registrationHash: designRegistration.registrationHash,
    runtimeConfigHash: sha256Hex("full-review-runtime-config"),
  });
  const execution = buildFullFinalExecutionFixture({
    sampleFixture: sample,
    authorizationBindings: {
      promptSetHash: frozenArtifacts.promptSet.promptSetHash,
      schemaSetHash: frozenArtifacts.schemaSet.schemaSetHash,
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
    },
  });
  const executionRegistration = execution.executionEvidence.executionRegistration;
  const reviewLedgerHead = seal({
    schemaVersion: "ReviewLedgerHeadV1",
    designId: "MAIS-NATURAL-CA60-V3",
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
    reviewLedgerHeadHash: reviewLedgerHead.reviewLedgerHeadHash,
    finalFinishedAt: execution.finalReceipt.finalFinishedAt,
  };
  const raw = {
    currentHeads,
    designRegistration,
    executionRegistration,
    frameRegistration: sample.frameRegistration,
    sampleManifest: sample.sampleManifest,
    frozenArtifacts,
    finalEvaluationBundle: execution,
    executionEvidence: execution.executionEvidence,
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

let fullReviewContextCache;

function fullReviewContext() {
  fullReviewContextCache ??= buildFullReviewContext();
  return structuredClone(fullReviewContextCache);
}

function buildContext() {
  const designRegistration = seal({
    schemaVersion: "NaturalCaPilotDesignRegistrationV3",
    designId: "MAIS-NATURAL-CA60-V3",
    frozenAt: "2026-08-25T01:00:00.000Z",
    supersedes: "DESIGN_V2",
  }, "registrationHash");
  const frozenArtifacts = {
    threshold: artifact("ThresholdRegistrationV1", "thresholdHash"),
    taxonomy: artifact("TaxonomyRegistrationV1", "taxonomyHash"),
    labelSchema: artifact("LabelSchemaRegistrationV1", "labelSchemaHash"),
    adjudicationMethod: artifact("AdjudicationMethodRegistrationV1", "adjudicationMethodHash"),
    severityRule: artifact("SeverityRuleRegistrationV1", "severityRuleHash"),
    promptSet: artifact("PromptSetRegistrationV1", "promptSetHash"),
    schemaSet: artifact("SchemaSetRegistrationV1", "schemaSetHash"),
    runner: artifact("RunnerRegistrationV1", "runnerHash"),
    adapter: artifact("AdapterRegistrationV1", "adapterHash"),
    statisticalPower: artifact("StatisticalPowerRegistrationV1", "statisticalPowerHash"),
    designSupersedes: artifact("DesignSupersedesRegistrationV1", "designSupersedesHash"),
  };
  Object.assign(designRegistration, {
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
  });
  seal(designRegistration, "registrationHash");
  const frameRegistration = seal({
    schemaVersion: "FrameRegistrationV1",
    designId: "MAIS-NATURAL-CA60-V3",
    registrationHash: designRegistration.registrationHash,
    samplingFrameHash: sha256Hex("protected-frame"),
    frozenAt: "2026-08-25T01:20:00.000Z",
  }, "frameRegistrationHash");
  const selectedRows = Array.from({ length: 60 }, (_, index) => ({
    itemId: `item-${String(index + 1).padStart(3, "0")}`,
    itemHash: sha256Hex(`item-${index + 1}`),
    clusterId: `cluster-${String(index + 1).padStart(3, "0")}`,
  }));
  const sampleManifest = seal({
    schemaVersion: "SampleManifestV2",
    designId: "MAIS-NATURAL-CA60-V3",
    registrationHash: designRegistration.registrationHash,
    frameRegistrationHash: frameRegistration.frameRegistrationHash,
    manifestFrozenAt: "2026-08-25T01:30:00.000Z",
    selectedRows,
    manifestTupleRootHash: canonicalHash(selectedRows.map(({ itemId, itemHash, clusterId }) => [itemId, itemHash, clusterId])),
  }, "sampleManifestHash");
  const c0RandomAudit = seal({
    schemaVersion: "C0RandomAuditSelectionV1",
    designId: "MAIS-NATURAL-CA60-V3",
    registrationHash: designRegistration.registrationHash,
    sampleManifestHash: sampleManifest.sampleManifestHash,
    frozenAt: "2026-08-25T01:40:00.000Z",
    selectedRows: selectedRows.slice(0, 12),
  }, "auditHash");
  const referenceSeal = seal({
    schemaVersion: "ReferenceLabelSealV1",
    designId: "MAIS-NATURAL-CA60-V3",
    registrationHash: designRegistration.registrationHash,
    frameRegistrationHash: frameRegistration.frameRegistrationHash,
    sampleManifestHash: sampleManifest.sampleManifestHash,
    referenceLabelsFrozenAt: "2026-08-25T02:00:00.000Z",
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
  }, "sealHash");
  const referenceExecutionBundle = { referenceSeal, attemptChain: [] };
  const executionRegistration = seal({
    schemaVersion: "ExecutionRegistrationV1",
    designId: "MAIS-NATURAL-CA60-V3",
    registrationHash: designRegistration.registrationHash,
    frameRegistrationHash: frameRegistration.frameRegistrationHash,
    sampleManifestHash: sampleManifest.sampleManifestHash,
    referenceSealHash: referenceSeal.sealHash,
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
    c0RandomAuditSelectionHash: c0RandomAudit.auditHash,
    frozenAt: "2026-08-25T02:30:00.000Z",
  }, "executionRegistrationHash");
  const metricResults = FROZEN_METRIC_ORDER.map(frozenMetric);
  const finalReceipt = seal({
    schemaVersion: "FinalEvaluationReceiptV1",
    designId: "MAIS-NATURAL-CA60-V3",
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
    claimCeiling: "CALIFORNIA_RUNTIME_EGRESS_ELIGIBLE_MACHINE_REFERENCE_PILOT_ONLY",
    finalFinishedAt: "2026-08-25T05:00:00.000Z",
  }, "receiptHash");
  const reviewLedgerHead = seal({
    schemaVersion: "ReviewLedgerHeadV1",
    designId: "MAIS-NATURAL-CA60-V3",
    latestFinalEvaluationReceiptHash: finalReceipt.receiptHash,
    previousReviewReceiptHash: null,
  }, "reviewLedgerHeadHash");
  const executionEvidence = {
    referenceExecutionBundle,
    deepSeekAuthorization: {},
    deepSeekAuthorizationExpected: {},
    deepSeekAttemptChain: [],
    deepSeekItemBundles: [],
    c0ExecutionSet: {},
    executionRegistration,
    deviationEvidence: {},
  };
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
    } : {}),
  };
  return seal({
    schemaVersion: "IndependentVerifierProofV1",
    designId: "MAIS-NATURAL-CA60-V3",
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
    designId: "MAIS-NATURAL-CA60-V3",
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
    recomputedDecision: recomputation.decision,
  });
  for (const field of TRUSTED_CONTEXT_FIELDS) receipt[field] = raw.currentHeads[field];
  return seal(receipt, "receiptHash");
}

function buildA18(raw, independentReviewReceipt) {
  const methodReviewEvidence = seal({
    schemaVersion: "A18MethodReviewEvidenceV1",
    designId: "MAIS-NATURAL-CA60-V3",
    taxonomyHash: raw.currentHeads.taxonomyHash,
    labelSchemaHash: raw.currentHeads.labelSchemaHash,
    adjudicationMethodHash: raw.currentHeads.adjudicationMethodHash,
    severityRuleHash: raw.currentHeads.severityRuleHash,
    publicLimitationSetHash: PUBLIC_LIMITATION_SET_HASH,
    publicClaimTemplateHash: PUBLIC_CLAIM_TEMPLATE_HASH,
    finalEvaluationReceiptHash: raw.currentHeads.latestFinalEvaluationReceiptHash,
  }, "methodReviewEvidenceHash");
  return seal({
    schemaVersion: "ClaimBoundaryReviewReceiptV1",
    designId: "MAIS-NATURAL-CA60-V3",
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
    reviewedClaimCeiling: raw.finalEvaluationBundle.finalReceipt.claimCeiling,
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
    designId: "MAIS-NATURAL-CA60-V3",
    registrationHash: raw.currentHeads.activeDesignRegistrationHash,
    finalEvaluationReceiptHash: raw.currentHeads.latestFinalEvaluationReceiptHash,
    independentReviewReceiptHash: a11.receiptHash,
    claimBoundaryReviewReceiptHash: a18.receiptHash,
    contentClass: "AGGREGATE_STATISTICS_HASHES_AND_LIMITATIONS_ONLY",
    conclusion: final.conclusion,
    decisionCeiling: final.decisionCeiling,
    claimCeiling: final.claimCeiling,
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

test("trusted context accepts exact self-hashed active artifacts and freeze chronology", () => {
  const raw = buildContext();
  assert.deepEqual(validateReviewRegistrationContextV1(raw), []);
});

test("trusted context rejects a current hash string not backed by the artifact bytes", () => {
  const raw = buildContext();
  raw.currentHeads.thresholdHash = sha256Hex("forged-threshold-root");
  assert.equal(validateReviewRegistrationContextV1(raw).some((error) => error.includes("thresholdHash is not backed")), true);
});

test("trusted context rejects an execution registration that omits a frozen head", () => {
  const raw = buildContext();
  raw.executionRegistration.taxonomyHash = sha256Hex("stale-taxonomy");
  seal(raw.executionRegistration, "executionRegistrationHash");
  assert.equal(validateReviewRegistrationContextV1(raw).some((error) => error.includes("execution registration taxonomyHash")), true);
});

test("trusted context rejects a threshold frozen after the first provider attempt", () => {
  const raw = buildContext();
  raw.executionEvidence.deepSeekAttemptChain.push({ startedAt: "2026-08-25T03:00:00.000Z", finishedAt: "2026-08-25T03:00:01.000Z" });
  raw.frozenArtifacts.threshold.frozenAt = "2026-08-25T03:30:00.000Z";
  seal(raw.frozenArtifacts.threshold, "thresholdHash");
  raw.currentHeads.thresholdHash = raw.frozenArtifacts.threshold.thresholdHash;
  raw.executionRegistration.thresholdHash = raw.frozenArtifacts.threshold.thresholdHash;
  seal(raw.executionRegistration, "executionRegistrationHash");
  raw.currentHeads.activeExecutionRegistrationHash = raw.executionRegistration.executionRegistrationHash;
  raw.finalEvaluationBundle.finalReceipt.executionRegistrationHash = raw.executionRegistration.executionRegistrationHash;
  seal(raw.finalEvaluationBundle.finalReceipt, "receiptHash");
  raw.currentHeads.latestFinalEvaluationReceiptHash = raw.finalEvaluationBundle.finalReceipt.receiptHash;
  assert.equal(validateReviewRegistrationContextV1(raw).some((error) => error.includes("threshold artifact was frozen after")), true);
});

test("trusted context rejects frame, sample, or C0 freeze after the first provider attempt", () => {
  const raw = buildContext();
  raw.executionEvidence.referenceExecutionBundle.attemptChain.push({
    startedAt: "2026-08-25T01:35:00.000Z",
    finishedAt: "2026-08-25T01:35:01.000Z",
  });
  const errors = validateReviewRegistrationContextV1(raw);
  assert.equal(errors.some((error) => error.includes("C0 selection was not frozen before the first provider attempt")), true);
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
  assert.equal(validateIndependentReviewReceiptV1(receipt, { rawReviewEvidence: raw })
    .some((error) => error.includes("input evidence root binding mismatch")), true);
});

test("summary-only hashes can never form A11 concurrence", () => {
  const receipt = seal({
    schemaVersion: "IndependentReviewReceiptV1",
    designId: "MAIS-NATURAL-CA60-V3",
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
  assert.deepEqual(validateIndependentReviewReceiptV1(a11, { rawReviewEvidence: raw }), []);
  assert.equal(a11.reviewStatus, "UNREVIEWABLE");
});

test("CONCURRED invokes full raw validators and rejects an empty DeepSeek execution bundle", () => {
  const raw = buildContext();
  const a11 = buildA11(raw, "CONCURRED");
  const errors = validateIndependentReviewReceiptV1(a11, { rawReviewEvidence: raw });
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
  assert.equal(validateIndependentReviewReceiptV1(a11, { rawReviewEvidence: raw })
    .some((error) => error.includes("distinct from the main scorer")), true);
});

test("A18 no-objection binds exact method roots, current A11 head, and review chronology", () => {
  const raw = buildContext();
  const a11 = buildA11(raw, "CONCURRED");
  const a18 = buildA18(raw, a11);
  assert.deepEqual(validateClaimBoundaryReviewReceiptV1(a18, { rawReviewEvidence: raw }, a11), []);
});

test("A18 rejects a stale taxonomy root", () => {
  const raw = buildContext();
  const a11 = buildA11(raw, "CONCURRED");
  const a18 = buildA18(raw, a11);
  a18.taxonomyHash = sha256Hex("stale-taxonomy");
  seal(a18, "receiptHash");
  assert.equal(validateClaimBoundaryReviewReceiptV1(a18, { rawReviewEvidence: raw }, a11)
    .some((error) => error.includes("taxonomyHash binding")), true);
});

test("A18 rejects a review timestamp before A11 and the final receipt", () => {
  const raw = buildContext();
  const a11 = buildA11(raw, "CONCURRED");
  const a18 = buildA18(raw, a11);
  a18.reviewedAt = "2026-08-25T04:00:00.000Z";
  seal(a18, "receiptHash");
  assert.equal(validateClaimBoundaryReviewReceiptV1(a18, { rawReviewEvidence: raw }, a11)
    .some((error) => error.includes("timestamp")), true);
});

test("A18 rejects any review head other than the exact A11 CONCURRED receipt", () => {
  const raw = buildContext();
  const a11 = buildA11(raw, "CONCURRED");
  const a18 = buildA18(raw, a11);
  a18.previousReceiptHash = sha256Hex("wrong-review-head");
  seal(a18, "receiptHash");
  assert.equal(validateClaimBoundaryReviewReceiptV1(a18, { rawReviewEvidence: raw }, a11)
    .some((error) => error.includes("exact current A11")), true);
});

test("public aggregate report accepts the exact nested allowlist and frozen limitations", () => {
  const raw = buildContext();
  const a11 = buildA11(raw, "CONCURRED");
  const a18 = buildA18(raw, a11);
  const report = buildReport(raw, a11, a18);
  assert.deepEqual(validatePublicAggregateReport(report, {
    evidence: { rawReviewEvidence: raw },
    independentReviewReceipt: a11,
    claimBoundaryReviewReceipt: a18,
  }), []);
});

test("public report rejects an extra nested metric field even when rehashed", () => {
  const raw = buildContext();
  const a11 = buildA11(raw, "CONCURRED");
  const a18 = buildA18(raw, a11);
  const report = buildReport(raw, a11, a18);
  report.aggregateStatistics.metricResults[0].rawProviderOutput = "hidden";
  seal(report, "reportHash");
  assert.equal(validatePublicAggregateReport(report, {
    evidence: { rawReviewEvidence: raw }, independentReviewReceipt: a11, claimBoundaryReviewReceipt: a18,
  }).some((error) => error.includes("nested metric") || error.includes("private")), true);
});

test("public report rejects a changed or omitted frozen limitation template", () => {
  const raw = buildContext();
  const a11 = buildA11(raw, "CONCURRED");
  const a18 = buildA18(raw, a11);
  const report = buildReport(raw, a11, a18);
  report.limitations.pop();
  seal(report, "reportHash");
  assert.equal(validatePublicAggregateReport(report, {
    evidence: { rawReviewEvidence: raw }, independentReviewReceipt: a11, claimBoundaryReviewReceipt: a18,
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
    assert.notDeepEqual(validatePublicAggregateReport(report, {
      evidence: { rawReviewEvidence: raw }, independentReviewReceipt: a11, claimBoundaryReviewReceipt: a18,
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
  assert.equal(validatePublicAggregateReport(report, {
    evidence: { rawReviewEvidence: raw }, independentReviewReceipt: a11, claimBoundaryReviewReceipt: a18,
  }).some((error) => error.includes("11-metric") || error.includes("nested metric")), true);
});

test("complete frame-to-sample, provider, A11, A18, and public evidence opens the aggregate export gate", () => {
  const raw = fullReviewContext();
  assert.deepEqual(validateReviewRegistrationContextV1(raw), []);
  const a11 = buildA11(raw, "CONCURRED");
  assert.deepEqual(validateIndependentReviewReceiptV1(a11, { rawReviewEvidence: raw }), []);
  const a18 = buildA18(raw, a11);
  assert.deepEqual(validateClaimBoundaryReviewReceiptV1(a18, { rawReviewEvidence: raw }, a11), []);
  const report = buildReport(raw, a11, a18);
  assert.deepEqual(validatePublicAggregateReport(report, {
    evidence: { rawReviewEvidence: raw }, independentReviewReceipt: a11, claimBoundaryReviewReceipt: a18,
  }), []);
  assert.equal(report.aggregateStatistics.qwenAttemptCount, 240);
  assert.equal(report.aggregateStatistics.deepSeekAttemptCount, 180);
  assert.equal(report.aggregateStatistics.totalAttemptCount, 420);
  assert.equal(canExportAggregateReport({
    evidence: { rawReviewEvidence: raw }, independentReviewReceipt: a11, claimBoundaryReviewReceipt: a18, report,
  }), true);
});

test("A11 CONCURRED requires a distinct post-execution runtime source-enumeration rerun receipt", () => {
  const raw = fullReviewContext();
  const protectedReceipt = raw.runtimeExtractionSnapshot.runtimeSourceEnumerationReceipt;
  delete raw.independentRuntimeSourceEnumerationReceipt;
  raw.independentRecomputation.recomputedRuntimeSourceEnumerationRootHash = protectedReceipt.fullSourceEnumerationRootHash;
  raw.independentRecomputation.independentSourceEnumerationReceiptHash = protectedReceipt.sourceEnumerationReceiptHash;
  seal(raw.independentRecomputation, "recomputationHash");
  const a11 = buildA11(raw, "CONCURRED");
  const errors = validateIndependentReviewReceiptV1(a11, { rawReviewEvidence: raw });
  assert.equal(errors.some((error) => error.includes("independent runtime source-enumeration rerun")), true);
  const a18 = buildA18(raw, a11);
  const report = buildReport(raw, a11, a18);
  assert.equal(canExportAggregateReport({
    evidence: { rawReviewEvidence: raw },
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
  const errors = validateIndependentReviewReceiptV1(a11, { rawReviewEvidence: raw });
  assert.equal(errors.some((error) => error.includes("13 grade invocation roots")), true);
});

test("A11 CONCURRED rejects a source-enumeration rerun against a stale source commit or runtime configuration", () => {
  for (const overrides of [
    { sourceCommit: "b".repeat(40) },
    { runtimeConfigHash: sha256Hex("stale-independent-runtime-config") },
  ]) {
    const raw = fullReviewContext();
    raw.independentRuntimeSourceEnumerationReceipt = buildIndependentRuntimeSourceEnumerationRerun(raw, overrides);
    const a11 = buildA11(raw, "CONCURRED");
    const errors = validateIndependentReviewReceiptV1(a11, { rawReviewEvidence: raw });
    assert.equal(errors.some((error) => error.includes("source/config/extractor tuple")), true);
  }
});

test("A11 CONCURRED requires every independently recomputed source-enumeration aggregate root to equal the frozen roots", () => {
  const raw = fullReviewContext();
  raw.independentRuntimeSourceEnumerationReceipt = buildIndependentRuntimeSourceEnumerationRerun(raw, {
    sourceCommit: "c".repeat(40),
  });
  const a11 = buildA11(raw, "CONCURRED");
  const errors = validateIndependentReviewReceiptV1(a11, { rawReviewEvidence: raw });
  assert.equal(errors.some((error) => error.includes("expected/runtime/serialized/failure/source-exclusion/full root set")), true);
});

test("A11 CONCURRED rejects reuse of the original source-enumeration receipt as the claimed independent rerun", () => {
  const raw = fullReviewContext();
  raw.independentRuntimeSourceEnumerationReceipt = structuredClone(
    raw.runtimeExtractionSnapshot.runtimeSourceEnumerationReceipt,
  );
  const a11 = buildA11(raw, "CONCURRED");
  const errors = validateIndependentReviewReceiptV1(a11, { rawReviewEvidence: raw });
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
    const errors = validateIndependentReviewReceiptV1(a11, { rawReviewEvidence: raw });
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
  assert.deepEqual(validateIndependentReviewReceiptV1(a11, { rawReviewEvidence: raw }), []);
});

test("full concurrence fails closed after a protected frame leaf or active root mutation", () => {
  const leafMutation = fullReviewContext();
  const leafReceipt = buildA11(leafMutation, "CONCURRED");
  leafMutation.frameRows[0].prompt += " tampered";
  assert.notDeepEqual(validateIndependentReviewReceiptV1(leafReceipt, { rawReviewEvidence: leafMutation }), []);

  const rootMutation = fullReviewContext();
  const rootReceipt = buildA11(rootMutation, "CONCURRED");
  rootMutation.currentHeads.referenceSealHash = sha256Hex("forged-active-reference-root");
  assert.notDeepEqual(validateIndependentReviewReceiptV1(rootReceipt, { rawReviewEvidence: rootMutation }), []);
});

test("A11 rejects a rehashed caller item result that differs from the result rebuilt from raw DeepSeek leaves", () => {
  const raw = fullReviewContext();
  const substituted = structuredClone(raw.finalEvaluationBundle.itemResults[0]);
  substituted.completedItemCommitMarkerHash = sha256Hex("caller-substituted-marker-root");
  seal(substituted, "itemResultHash");
  raw.finalEvaluationBundle.itemResults[0] = substituted;
  raw.independentRecomputation = buildIndependentRecomputation(raw);
  const a11 = buildA11(raw, "CONCURRED");
  assert.notDeepEqual(validateIndependentReviewReceiptV1(a11, { rawReviewEvidence: raw }), []);
});

test("a structurally valid public report still cannot export without full A11 raw concurrence", () => {
  const raw = buildContext();
  const a11 = buildA11(raw, "CONCURRED");
  const a18 = buildA18(raw, a11);
  const report = buildReport(raw, a11, a18);
  assert.equal(canExportAggregateReport({
    evidence: { rawReviewEvidence: raw },
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
      evidence: { rawReviewEvidence: raw }, independentReviewReceipt: a11, claimBoundaryReviewReceipt: a18, report,
    }), false, status);
  }
});
