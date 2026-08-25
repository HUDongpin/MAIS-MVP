import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stat } from "node:fs/promises";
import test from "node:test";

import * as designContract from "./design-contract.mjs";
import * as reviewGate from "./review-gate.mjs";
import {
  buildHypotheticalFrozenRegistrationV4,
  buildTestFixtureOnlySyntheticSealedRegistrationV4,
  createTestFixtureOnlyReviewGatePairV4,
  createTestFixtureOnlyReviewGateV4,
} from "./review-test-fixtures.mjs";
import {
  calculateManifestTupleRootV3,
  materializeSamplePseudonymFieldsV4,
  SAMPLE_ALGORITHM_VERSION,
} from "./sample-contract.mjs";
import { RUNTIME_CONFIG_HASH, SOURCE_COMMIT } from "./test-fixtures.mjs";

const ACTUAL_REGISTRATION_URL = new URL("./design-registration.json", import.meta.url);
const TEST_FIXTURE_ONLY_DESIGN_REGISTRATION = buildTestFixtureOnlySyntheticSealedRegistrationV4();
const TEST_FIXTURE_ONLY_REVIEW_GATE = await createTestFixtureOnlyReviewGateV4(
  TEST_FIXTURE_ONLY_DESIGN_REGISTRATION,
);
test.after(async () => TEST_FIXTURE_ONLY_REVIEW_GATE.dispose());

function actualRegistration() {
  return JSON.parse(readFileSync(ACTUAL_REGISTRATION_URL, "utf8"));
}

function requiredFunction(name) {
  assert.equal(typeof reviewGate[name], "function", `${name} must be an executable V4 review contract`);
  return reviewGate[name];
}

function seal(artifact, hashField) {
  artifact[hashField] = designContract.calculateArtifactHash(artifact, hashField);
  return artifact;
}

function addMinutes(timestamp, minutes) {
  return new Date(Date.parse(timestamp) + minutes * 60_000).toISOString();
}

function sampleRowsV4() {
  return Array.from({ length: 60 }, (_, index) => ({
    itemId: `item-${index + 1}`,
    itemHash: String(index + 1).padStart(64, "0"),
    clusterId: `c-${index + 1}`,
  }));
}

function frozenSampleManifestV4({
  registrationHash = "1".repeat(64),
  frameRegistrationHash = "4".repeat(64),
  manifestFrozenAt = "2026-08-25T05:00:00.000Z",
} = {}) {
  const selectedRows = sampleRowsV4();
  return seal(materializeSamplePseudonymFieldsV4({
    schemaVersion: "SampleManifestV2",
    designId: "MAIS-NATURAL-CA60-V4",
    registrationHash,
    frameRegistrationHash,
    manifestFrozenAt,
    sampleVersion: 1,
    supersedesSampleManifestHash: null,
    algorithmVersion: SAMPLE_ALGORITHM_VERSION,
    manifestTupleRootHash: calculateManifestTupleRootV3(selectedRows),
    selectedRows,
  }), "sampleManifestHash");
}

function protectedC0FixtureV4(overrides = {}) {
  const registrationHash = overrides.registrationHash ?? "1".repeat(64);
  const sampleManifestHash = overrides.sampleManifestHash ?? "2".repeat(64);
  const executionRegistrationHash = overrides.executionRegistrationHash ?? "3".repeat(64);
  const sampleRows = (overrides.sampleManifest?.selectedRows ?? frozenSampleManifestV4({
    registrationHash,
    frameRegistrationHash: overrides.frameRegistrationHash ?? "4".repeat(64),
  }).selectedRows);
  const registeredRandomAuditRows = sampleRows.slice(0, 12);
  const protectedItemBundles = sampleRows.map((row, index) => ({
    itemIdentity: structuredClone(row),
    localDeterministicEvidence: {
      schemaVersion: "C0LocalDeterministicEvidenceV1",
      algorithmSetHash: "4".repeat(64),
      itemHash: row.itemHash,
      mathAnswerKey: { screenComplete: true, issueCodes: index === 12 ? ["POSSIBLE_P1"] : [] },
      rightsProvenanceReconstruction: { screenComplete: true, disposition: "CLEARED_FOR_AUTHORIZED_EGRESS", issueCodes: [] },
      learnerFit: { screenComplete: true, checkedDimensions: ["AGE", "GRADE", "CURRICULUM", "LANGUAGE", "REGION"], issueCodes: [] },
      answerCriticalEvidence: { screenComplete: true, requiredAssetTypes: [], verifiedAssetTypes: [], issueCodes: [] },
      validation: { schemaValid: true, roleSequenceValid: true, taxonomyCodesValid: true, errorCodes: [] },
      deterministicFindingKeys: [],
    },
    bPrimeCritique: {
      schemaVersion: "BPrimeCritiqueEvidenceV1",
      itemHash: row.itemHash,
      requiredRevisionCodes: [],
      validityStatus: "VALID",
    },
    bPrimeRevision: {
      schemaVersion: "BPrimeRevisionEvidenceV1",
      itemHash: row.itemHash,
      resolvedCritiqueCodes: [],
      finalFindingKeys: [],
      validityStatus: "VALID",
    },
    validatedScope: {
      schemaVersion: "C0ValidatedScopeV1",
      itemHash: row.itemHash,
      itemScopeTags: ["CA", "US_CA_MATH", "STUDENT"],
      allowedScopeTags: ["CA", "US_CA_MATH", "STUDENT"],
      metadataEvidenceComplete: true,
      declaredDistribution: "IN_SCOPE",
    },
    registeredRandomAudit: index < 12,
  }));
  const context = { registrationHash, sampleManifestHash, executionRegistrationHash };
  const sealedTriggerInputs = protectedItemBundles.map((bundle) => (
    designContract.recomputeC0TriggerInputFromProtectedItemV4(bundle, context)
  ));
  const sealedTriggerDecisions = sealedTriggerInputs.map(designContract.deriveC0TriggerDecision);
  const sealedExecutionSet = designContract.deriveC0ExecutionSetV4({
    ...context,
    sampleRows,
    registeredRandomAuditRows,
    triggerInputs: sealedTriggerInputs,
    deepSeekSuccessfulCallCap: 420,
  });
  return {
    ...context,
    sampleRows,
    registeredRandomAuditRows,
    protectedItemBundles,
    sealedTriggerInputs,
    sealedTriggerDecisions,
    sealedExecutionSet,
    deepSeekSuccessfulCallCap: 420,
  };
}

function finalSummaryFixtureV4() {
  const sourceEvidence = {
    matchingMatrix: [{ referenceFindingId: "r1", machineFindingId: "m1", matchType: "EXACT" }],
    strata: [{ stratum: "short-answer::Medium", selectedCount: 60 }],
    clusterWeights: [{ clusterId: "c1", primaryWeight: 1, analysisWeight: 2 }],
    kishEffectiveSampleSize: 59.5,
    agreement: {
      rawAgreement: 0.9,
      cohenKappa: 0.8,
      gwetAc1: 0.85,
      familyJaccard: 0.9,
      codeJaccard: 0.88,
      severityAgreement: 0.92,
    },
    adjudicationCount: 12,
    itemCount: 60,
  };
  const summary = designContract.deriveFinalReceiptSummariesV4(sourceEvidence);
  return {
    sourceEvidence,
    finalReceipt: {
      matchingMatrixHash: summary.matchingMatrixHash,
      matchingMatrix: structuredClone(sourceEvidence.matchingMatrix),
      strataSummaryHash: summary.strataSummaryHash,
      strataSummary: structuredClone(sourceEvidence.strata),
      clusterWeightSummaryHash: summary.clusterWeightSummaryHash,
      clusterWeightSummary: structuredClone(sourceEvidence.clusterWeights),
      kishEffectiveSampleSize: sourceEvidence.kishEffectiveSampleSize,
      agreementSummaryHash: summary.agreementSummaryHash,
      agreementSummary: structuredClone(sourceEvidence.agreement),
      adjudicationSummary: structuredClone(summary.adjudicationSummary),
      finalSummaryRootHash: summary.finalSummaryRootHash ?? summary.summaryRootHash,
    },
  };
}

function stageChainFixtureV4() {
  const designRegistration = structuredClone(TEST_FIXTURE_ONLY_DESIGN_REGISTRATION);
  const designComponentHashes = structuredClone(
    designRegistration.designComponentHashes ?? designRegistration.frozenContractHashes ?? {},
  );
  const registrationHash = designRegistration.registrationHash;
  const frameFrozenAt = addMinutes(designRegistration.frozenAt, 1);
  const sampleFrozenAt = addMinutes(designRegistration.frozenAt, 2);
  const runnerFrozenAt = addMinutes(designRegistration.frozenAt, 3);
  const adapterFrozenAt = addMinutes(designRegistration.frozenAt, 4);
  const qwenAuthorizedAt = addMinutes(designRegistration.frozenAt, 5);
  const referenceFrozenAt = addMinutes(designRegistration.frozenAt, 6);
  const deepSeekAuthorizedAt = addMinutes(designRegistration.frozenAt, 7);
  const executionFrozenAt = addMinutes(designRegistration.frozenAt, 8);
  const runnerArtifact = seal({
    schemaVersion: "NaturalCaRunnerArtifactV4",
    designId: "MAIS-NATURAL-CA60-V4",
    registrationHash,
    frozenAt: runnerFrozenAt,
    implementationRootHash: "a".repeat(64),
  }, "runnerHash");
  const adapterArtifact = seal({
    schemaVersion: "NaturalCaAdapterArtifactV4",
    designId: "MAIS-NATURAL-CA60-V4",
    registrationHash,
    frozenAt: adapterFrozenAt,
    implementationRootHash: "b".repeat(64),
  }, "adapterHash");
  const frameRegistration = seal({
    schemaVersion: "FrameRegistrationV1",
    designId: "MAIS-NATURAL-CA60-V4",
    registrationHash,
    sourceCommit: SOURCE_COMMIT,
    runtimeConfigHash: RUNTIME_CONFIG_HASH,
    frozenAt: frameFrozenAt,
  }, "frameRegistrationHash");
  const sampleManifest = frozenSampleManifestV4({
    registrationHash,
    frameRegistrationHash: frameRegistration.frameRegistrationHash,
    manifestFrozenAt: sampleFrozenAt,
  });
  const authorizationBase = {
    schemaVersion: "ProviderAuthorizationV1",
    designId: "MAIS-NATURAL-CA60-V4",
    registrationHash,
    frameRegistrationHash: frameRegistration.frameRegistrationHash,
    sampleManifestHash: sampleManifest.sampleManifestHash,
    designComponentHashes,
    runnerHash: runnerArtifact.runnerHash,
    adapterHash: adapterArtifact.adapterHash,
    priceSnapshotHash: "d".repeat(64),
    ownerGrantRootHash: "e".repeat(64),
  };
  const qwenAuthorization = seal({
    ...authorizationBase,
    provider: "QWEN_MACHINE_REFERENCE",
    issuedAt: qwenAuthorizedAt,
  }, "authorizationHash");
  const referenceLabelSeal = seal({
    schemaVersion: "ReferenceLabelSealV1",
    designId: "MAIS-NATURAL-CA60-V4",
    registrationHash,
    frameRegistrationHash: frameRegistration.frameRegistrationHash,
    sampleManifestHash: sampleManifest.sampleManifestHash,
    qwenAuthorizationHash: qwenAuthorization.authorizationHash,
    referenceLabelsFrozenAt: referenceFrozenAt,
  }, "sealHash");
  const deepSeekAuthorization = seal({
    ...authorizationBase,
    provider: "DEEPSEEK_EVALUATION",
    referenceSealHash: referenceLabelSeal.sealHash,
    issuedAt: deepSeekAuthorizedAt,
  }, "authorizationHash");
  const executionRegistration = seal({
    schemaVersion: "ExecutionRegistrationV1",
    designId: "MAIS-NATURAL-CA60-V4",
    registrationHash,
    frameRegistrationHash: frameRegistration.frameRegistrationHash,
    sampleManifestHash: sampleManifest.sampleManifestHash,
    qwenAuthorizationHash: qwenAuthorization.authorizationHash,
    referenceSealHash: referenceLabelSeal.sealHash,
    deepSeekAuthorizationHash: deepSeekAuthorization.authorizationHash,
    designComponentHashes,
    runnerHash: runnerArtifact.runnerHash,
    adapterHash: adapterArtifact.adapterHash,
    frozenAt: executionFrozenAt,
  }, "executionRegistrationHash");
  return {
    designRegistration,
    runnerArtifact,
    adapterArtifact,
    frameRegistration,
    sampleManifest,
    qwenAuthorization,
    referenceLabelSeal,
    deepSeekAuthorization,
    executionRegistration,
  };
}

function trustedAuthorizationFixtureV4() {
  const stage = stageChainFixtureV4();
  const routeProbeAuthorization = seal({
    schemaVersion: "DeepSeekRouteProbeAuthorizationV1",
    designId: "MAIS-NATURAL-CA60-V4",
    registrationHash: stage.designRegistration.registrationHash,
    ownerGrantRootHash: "9".repeat(64),
  }, "authorizationHash");
  const trustedAuthorizationRoots = {
    qwen: {
      authorizationHash: stage.qwenAuthorization.authorizationHash,
      priceSnapshotHash: stage.qwenAuthorization.priceSnapshotHash,
      ownerGrantRootHash: stage.qwenAuthorization.ownerGrantRootHash,
    },
    deepSeek: {
      authorizationHash: stage.deepSeekAuthorization.authorizationHash,
      priceSnapshotHash: stage.deepSeekAuthorization.priceSnapshotHash,
      ownerGrantRootHash: stage.deepSeekAuthorization.ownerGrantRootHash,
    },
    routeProbe: {
      authorizationHash: routeProbeAuthorization.authorizationHash,
      ownerGrantRootHash: routeProbeAuthorization.ownerGrantRootHash,
    },
  };
  return {
    raw: {
      executionEvidence: {
        referenceExecutionBundle: { authorization: stage.qwenAuthorization },
        deepSeekAuthorization: stage.deepSeekAuthorization,
        routeProbeAuthorization,
      },
    },
    trustedAuthorizationRoots,
  };
}

function missingReceiptAccountingFixtureV4(missingCount = 3, overrides = {}) {
  const sampleManifest = overrides.sampleManifest ?? frozenSampleManifestV4({
    registrationHash: overrides.registrationHash ?? "1".repeat(64),
    frameRegistrationHash: overrides.frameRegistrationHash ?? "4".repeat(64),
  });
  const upstream = {
    registrationHash: overrides.registrationHash ?? "1".repeat(64),
    sampleManifestHash: sampleManifest.sampleManifestHash,
    executionRegistrationHash: overrides.executionRegistrationHash ?? "3".repeat(64),
  };
  const sampleManifestRows = structuredClone(sampleManifest.selectedRows);
  const completeCount = 60 - missingCount;
  const deepSeekCompleteItemBundles = sampleManifestRows.slice(0, completeCount).map((row) => ({
    ...structuredClone(row),
    executionDisposition: "COMPLETE",
  }));
  const deepSeekMissingReceiptItemBundles = sampleManifestRows.slice(completeCount).map((row) => {
    const itemAttemptReceipts = [];
    for (const attemptNumber of [1, 2]) {
      const startedAt = new Date(Date.parse("2026-08-25T06:10:00.000Z") + attemptNumber * 2_000).toISOString();
      itemAttemptReceipts.push(seal({
        schemaVersion: "ProviderAttemptReceiptV1",
        designId: "MAIS-NATURAL-CA60-V4",
        runId: `review-missing-${row.itemIdPseudonym}`,
        registrationHash: upstream.registrationHash,
        frameRegistrationHash: sampleManifest.frameRegistrationHash,
        sampleManifestHash: upstream.sampleManifestHash,
        runtimeConfigHash: "5".repeat(64),
        authorizationHash: "6".repeat(64),
        referenceSealHash: "7".repeat(64),
        executionRegistrationHash: upstream.executionRegistrationHash,
        itemHash: row.itemHash,
        itemIdPseudonym: row.itemIdPseudonym,
        clusterId: row.clusterId,
        role: "C0_PRIME_ROLE_5",
        attemptId: `${row.itemIdPseudonym}-attempt-${attemptNumber}`,
        sequenceNumber: attemptNumber,
        requestedProvider: "DEEPSEEK_DIRECT",
        observedProvider: null,
        requestedModel: "deepseek-v4-pro",
        observedModel: null,
        requestedEndpoint: "https://api.deepseek.com/chat/completions",
        observedEndpointHostname: null,
        provider: "DEEPSEEK_DIRECT",
        model: "deepseek-v4-pro",
        endpoint: "https://api.deepseek.com/chat/completions",
        requestBodyHash: "8".repeat(64),
        responseBodyHash: null,
        parsedOutputHash: null,
        logicalRequestHash: "9".repeat(64),
        wireRequestBodyHash: "8".repeat(64),
        rawWireResponseHash: null,
        parsedProviderEnvelopeHash: null,
        extractedMessageContentHash: null,
        parsedRolePayloadHash: null,
        providerUsageHash: null,
        adapterTransformHash: "a".repeat(64),
        dispatchState: "DISPATCHED",
        usageState: "USAGE_UNKNOWN_PENDING_PROVIDER_RECONCILIATION",
        reservedTokens: 16384,
        reservedUsd: 1,
        reconciliationReceiptHash: null,
        startedAt,
        finishedAt: new Date(Date.parse(startedAt) + 1_000).toISOString(),
        latencyMs: 1000,
        httpStatus: null,
        providerRequestId: null,
        finishReason: null,
        parseStatus: "NOT_ATTEMPTED",
        schemaStatus: "NOT_ATTEMPTED",
        attemptStatus: "TIMEOUT",
        inputTokens: 0,
        outputTokens: 0,
        reasoningTokens: 0,
        totalTokens: 0,
        rawUsage: { promptTokens: 0, completionTokens: 0, reasoningTokens: 0, totalTokens: 0 },
        usageMappingVersion: "OPENAI_COMPAT_REASONING_INCLUDED_IN_COMPLETION_V1",
        costRateSnapshotHash: "b".repeat(64),
        estimatedCost: 0,
        cumulativeCost: 0,
        retryClassification: "TRANSIENT_RETRY_ALLOWED_ONLY_IF_REMAINING_CAP_COVERS_NEW_RESERVE",
        redactedError: "PROVIDER_TIMEOUT_REDACTED",
        appendOnly: true,
        atomicWrite: true,
        fileMode: "0600",
        completedItemCommitMarkerHash: null,
        cacheHit: false,
        providerInvoiceAuthoritative: true,
        previousReceiptHash: itemAttemptReceipts.at(-1)?.selfHash ?? null,
      }, "selfHash"));
    }
    return designContract.buildMissingReceiptItemBundleV1({
      ...upstream,
      ...row,
      reasonCode: "PROVIDER_ATTEMPTS_EXHAUSTED",
      itemAttemptReceipts,
      successfulRoleEvidence: [],
    });
  });
  return {
    ...upstream,
    sampleManifest,
    sampleManifestRows,
    deepSeekCompleteItemBundles,
    deepSeekMissingReceiptItemBundles,
  };
}

function protectedStageContextV4() {
  const stage = stageChainFixtureV4();
  const finalReceipt = seal({
    schemaVersion: "FinalEvaluationReceiptV1",
    designId: "MAIS-NATURAL-CA60-V4",
    registrationHash: stage.designRegistration.registrationHash,
    executionRegistrationHash: stage.executionRegistration.executionRegistrationHash,
    frameRegistrationHash: stage.frameRegistration.frameRegistrationHash,
    sampleManifestHash: stage.sampleManifest.sampleManifestHash,
    referenceSealHash: stage.referenceLabelSeal.sealHash,
    finalFinishedAt: addMinutes(stage.executionRegistration.frozenAt, 2),
  }, "receiptHash");
  const reviewLedgerHead = seal({
    schemaVersion: "ReviewLedgerHeadV1",
    designId: "MAIS-NATURAL-CA60-V4",
    latestFinalEvaluationReceiptHash: finalReceipt.receiptHash,
  }, "reviewLedgerHeadHash");
  return {
    ...stage,
    currentHeads: {
      activeDesignRegistrationHash: stage.designRegistration.registrationHash,
      activeExecutionRegistrationHash: stage.executionRegistration.executionRegistrationHash,
      frameRegistrationHash: stage.frameRegistration.frameRegistrationHash,
      sampleManifestHash: stage.sampleManifest.sampleManifestHash,
      referenceSealHash: stage.referenceLabelSeal.sealHash,
      runnerHash: stage.runnerArtifact.runnerHash,
      adapterHash: stage.adapterArtifact.adapterHash,
      methodComponentRootSetHash: designContract.FROZEN_METHOD_COMPONENT_ROOTS_V4_HASH,
      latestFinalEvaluationReceiptHash: finalReceipt.receiptHash,
      reviewLedgerHeadHash: reviewLedgerHead.reviewLedgerHeadHash,
      finalFinishedAt: finalReceipt.finalFinishedAt,
    },
    executionEvidence: {
      referenceExecutionBundle: {
        authorization: stage.qwenAuthorization,
        referenceSeal: stage.referenceLabelSeal,
        attemptChain: [],
      },
      deepSeekAuthorization: stage.deepSeekAuthorization,
      deepSeekAttemptChain: [],
      executionRegistration: stage.executionRegistration,
    },
    finalEvaluationBundle: { finalReceipt },
    reviewLedgerHead,
  };
}

test("production review trust remains pinned to the on-disk candidate while an explicit test-only kernel accepts a nonauthorizing synthetic seal", () => {
  const registration = actualRegistration();
  assert.equal(registration.designId, "MAIS-NATURAL-CA60-V4");
  assert.equal(registration.version, 4);
  assert.notDeepEqual(reviewGate.validateReviewDesignRegistrationV4(registration), []);

  assert.deepEqual(
    TEST_FIXTURE_ONLY_REVIEW_GATE.validateReviewDesignRegistrationV4(TEST_FIXTURE_ONLY_DESIGN_REGISTRATION),
    [],
  );
  assert.notDeepEqual(
    reviewGate.validateReviewDesignRegistrationV4(TEST_FIXTURE_ONLY_DESIGN_REGISTRATION),
    [],
  );
  assert.equal(TEST_FIXTURE_ONLY_REVIEW_GATE.canExportAggregateReport({}), false);
});

test("production review module namespace exposes no caller-selected registration trust override", () => {
  for (const forbiddenExport of [
    "validateReviewDesignRegistrationV4AgainstTrustedRegistration",
    "validateV4ReviewStageContextAgainstTrustedRegistration",
    "validateReviewRegistrationContextV1AgainstTrustedRegistration",
    "validateIndependentReviewReceiptV1AgainstTrustedRegistration",
    "canExportAggregateReportAgainstTrustedRegistration",
    "createTestFixtureOnlyReviewGateV4",
  ]) {
    assert.equal(Object.hasOwn(reviewGate, forbiddenExport), false, forbiddenExport);
  }
  assert.equal(typeof reviewGate.validateAggregatePublicationConsistencyV1, "function");
  assert.equal(reviewGate.canExportAggregateReport({}), false);
  assert.equal(typeof reviewGate.evaluateAggregatePublicationAuthorizationV1, "function");
  assert.deepEqual(reviewGate.evaluateAggregatePublicationAuthorizationV1(), {
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

test("temporary review module setup removes its exact directory after a post-mkdtemp failure", async () => {
  let temporaryRoot = null;
  await assert.rejects(
    createTestFixtureOnlyReviewGateV4(TEST_FIXTURE_ONLY_DESIGN_REGISTRATION, {
      failAfterMkdtempForTest: true,
      observeTemporaryRootForTest(root) {
        temporaryRoot = root;
      },
    }),
    /injected post-mkdtemp setup failure/u,
  );
  assert.equal(typeof temporaryRoot, "string");
  await assert.rejects(stat(temporaryRoot), { code: "ENOENT" });
});

test("temporary review gate pair disposes the first gate when the second factory fails", async () => {
  let firstTemporaryRoot = null;
  let secondTemporaryRoot = null;
  await assert.rejects(
    createTestFixtureOnlyReviewGatePairV4(
      TEST_FIXTURE_ONLY_DESIGN_REGISTRATION,
      buildHypotheticalFrozenRegistrationV4(),
      {
        firstTestControls: {
          observeTemporaryRootForTest(root) {
            firstTemporaryRoot = root;
          },
        },
        secondTestControls: {
          failAfterMkdtempForTest: true,
          observeTemporaryRootForTest(root) {
            secondTemporaryRoot = root;
          },
        },
      },
    ),
    /injected post-mkdtemp setup failure/u,
  );
  assert.equal(typeof firstTemporaryRoot, "string");
  assert.equal(typeof secondTemporaryRoot, "string");
  await assert.rejects(stat(firstTemporaryRoot), { code: "ENOENT" });
  await assert.rejects(stat(secondTemporaryRoot), { code: "ENOENT" });
});

test("review gate uses the exact public limitation-code set frozen by the on-disk registration", () => {
  const registration = actualRegistration();
  assert.deepEqual(
    reviewGate.FROZEN_PUBLIC_LIMITATIONS.map(({ code }) => code),
    registration.publicReportContract?.limitationCodes
      ?? registration.publicReport?.limitationCodes,
  );
  assert.equal(reviewGate.PUBLIC_LIMITATION_SET_HASH, designContract.FROZEN_PUBLIC_LIMITATIONS_V4_HASH);
  assert.equal(reviewGate.DECISION_CEILING, designContract.DECISION_CEILING_V4);
  assert.equal(reviewGate.CLAIM_SCOPE_CEILING, designContract.CLAIM_SCOPE_CEILING_V4);
  assert.match(designContract.FROZEN_METHOD_COMPONENT_ROOTS_V4_HASH, /^[0-9a-f]{64}$/u);
  assert.equal(
    designContract.FROZEN_METHOD_COMPONENT_ROOTS_V4.publicLimitationSetHash,
    designContract.FROZEN_PUBLIC_LIMITATIONS_V4_HASH,
  );
});

test("V4 test-only stage chain consumes sealed design components and binds runner and adapter only in later execution artifacts", () => {
  const validate = TEST_FIXTURE_ONLY_REVIEW_GATE.validateV4ReviewStageContext;
  const stage = stageChainFixtureV4();
  assert.equal(Object.hasOwn(stage.designRegistration, "runnerHash"), false);
  assert.equal(Object.hasOwn(stage.designRegistration, "adapterHash"), false);
  assert.equal(Date.parse(stage.runnerArtifact.frozenAt) > Date.parse(stage.designRegistration.frozenAt), true);
  assert.deepEqual(validate(stage), []);

  const staleBundle = structuredClone(stage);
  staleBundle.designRegistration.scope.claimBasis = "STALE_WHOLE_BUNDLE_SUBSTITUTION";
  seal(staleBundle.designRegistration, "registrationHash");
  assert.equal(validate(staleBundle).some((error) => /stale or substituted whole bundle/u.test(error)), true);

  const staleComponent = structuredClone(stage);
  staleComponent.executionRegistration.designComponentHashes.taxonomyHash = "f".repeat(64);
  seal(staleComponent.executionRegistration, "executionRegistrationHash");
  assert.equal(validate(staleComponent).some((error) => /design component/u.test(error)), true);
});

test("V4 review stage chronology is strictly design then frame sample authorization seal authorization execution", () => {
  const validate = TEST_FIXTURE_ONLY_REVIEW_GATE.validateV4ReviewStageContext;
  const stage = stageChainFixtureV4();
  stage.deepSeekAuthorization.issuedAt = addMinutes(stage.qwenAuthorization.issuedAt, 0.5);
  seal(stage.deepSeekAuthorization, "authorizationHash");
  stage.executionRegistration.deepSeekAuthorizationHash = stage.deepSeekAuthorization.authorizationHash;
  seal(stage.executionRegistration, "executionRegistrationHash");
  assert.equal(validate(stage).some((error) => /chronology/u.test(error)), true);
});

test("full V4 registration-context gate follows the explicit test-only stage chain without synthetic V3 component heads", () => {
  const raw = protectedStageContextV4();
  assert.deepEqual(TEST_FIXTURE_ONLY_REVIEW_GATE.validateReviewRegistrationContextV1(raw), []);
});

test("V4 trusted heads require the exact code-derived method component root", () => {
  const missing = protectedStageContextV4();
  delete missing.currentHeads.methodComponentRootSetHash;
  assert.equal(
    TEST_FIXTURE_ONLY_REVIEW_GATE.validateReviewRegistrationContextV1(missing)
      .some((error) => /methodComponentRootSetHash|method component root/iu.test(error)),
    true,
  );

  const substituted = protectedStageContextV4();
  substituted.currentHeads.methodComponentRootSetHash = "0".repeat(64);
  assert.equal(
    TEST_FIXTURE_ONLY_REVIEW_GATE.validateReviewRegistrationContextV1(substituted)
      .some((error) => /methodComponentRootSetHash|method component root/iu.test(error)),
    true,
  );
});

test("A18 receipt and method evidence must bind the mandatory trusted method-component head", () => {
  const raw = protectedStageContextV4();
  const final = raw.finalEvaluationBundle.finalReceipt;
  final.conclusion = designContract.DECISION_CEILING_V4;
  final.claimScopeCeiling = designContract.CLAIM_SCOPE_CEILING_V4;
  seal(final, "receiptHash");
  raw.currentHeads.latestFinalEvaluationReceiptHash = final.receiptHash;

  Object.assign(raw.currentHeads, {
    thresholdHash: "a".repeat(64),
    taxonomyHash: "b".repeat(64),
    labelSchemaHash: "c".repeat(64),
    adjudicationMethodHash: "d".repeat(64),
    severityRuleHash: "e".repeat(64),
  });
  const independentReviewReceipt = seal({
    schemaVersion: "IndependentReviewReceiptV1",
    designId: designContract.DESIGN_ID,
    reviewStatus: "CONCURRED",
    reviewedAt: addMinutes(final.finalFinishedAt, 1),
  }, "receiptHash");
  const methodReviewEvidence = seal({
    schemaVersion: "A18MethodReviewEvidenceV1",
    designId: designContract.DESIGN_ID,
    taxonomyHash: raw.currentHeads.taxonomyHash,
    labelSchemaHash: raw.currentHeads.labelSchemaHash,
    adjudicationMethodHash: raw.currentHeads.adjudicationMethodHash,
    severityRuleHash: raw.currentHeads.severityRuleHash,
    methodComponentRootSetHash: designContract.FROZEN_METHOD_COMPONENT_ROOTS_V4_HASH,
    publicLimitationSetHash: reviewGate.PUBLIC_LIMITATION_SET_HASH,
    publicClaimTemplateHash: reviewGate.PUBLIC_CLAIM_TEMPLATE_HASH,
    finalEvaluationReceiptHash: final.receiptHash,
  }, "methodReviewEvidenceHash");
  const receipt = seal({
    schemaVersion: "ClaimBoundaryReviewReceiptV1",
    designId: designContract.DESIGN_ID,
    registrationHash: raw.currentHeads.activeDesignRegistrationHash,
    executionRegistrationHash: raw.currentHeads.activeExecutionRegistrationHash,
    finalEvaluationReceiptHash: final.receiptHash,
    referenceSealHash: raw.currentHeads.referenceSealHash,
    frameRegistrationHash: raw.currentHeads.frameRegistrationHash,
    sampleManifestHash: raw.currentHeads.sampleManifestHash,
    thresholdHash: raw.currentHeads.thresholdHash,
    taxonomyHash: raw.currentHeads.taxonomyHash,
    labelSchemaHash: raw.currentHeads.labelSchemaHash,
    adjudicationMethodHash: raw.currentHeads.adjudicationMethodHash,
    severityRuleHash: raw.currentHeads.severityRuleHash,
    methodComponentRootSetHash: designContract.FROZEN_METHOD_COMPONENT_ROOTS_V4_HASH,
    publicLimitationSetHash: reviewGate.PUBLIC_LIMITATION_SET_HASH,
    publicClaimTemplateHash: reviewGate.PUBLIC_CLAIM_TEMPLATE_HASH,
    independentReviewReceiptHash: independentReviewReceipt.receiptHash,
    reviewLedgerHeadHash: independentReviewReceipt.receiptHash,
    reviewerLane: "A18",
    provenanceType: "A18_METHOD_AND_CLAIM_BOUNDARY_REVIEW",
    reviewScope: "TAXONOMY_ADJUDICATION_SEVERITY_AND_CLAIM_WORDING_ONLY",
    humanGoldLabelReview: false,
    sourceArtifactsReadOnly: true,
    reviewedDecision: final.conclusion,
    reviewedClaimScopeCeiling: final.claimScopeCeiling,
    methodReviewEvidence,
    claimBoundaryStatus: "NO_OBJECTION",
    objectionCodes: [],
    objectionReason: null,
    reviewedAt: addMinutes(independentReviewReceipt.reviewedAt, 1),
    previousReceiptHash: independentReviewReceipt.receiptHash,
  }, "receiptHash");
  assert.equal(
    reviewGate.validateClaimBoundaryReviewReceiptShapeAndEvidenceV1(receipt, { rawReviewEvidence: raw }, independentReviewReceipt)
      .some((error) => /method component root/iu.test(error)),
    false,
  );

  const omitted = structuredClone(receipt);
  delete omitted.methodReviewEvidence.methodComponentRootSetHash;
  seal(omitted.methodReviewEvidence, "methodReviewEvidenceHash");
  seal(omitted, "receiptHash");
  assert.equal(
    reviewGate.validateClaimBoundaryReviewReceiptShapeAndEvidenceV1(omitted, { rawReviewEvidence: raw }, independentReviewReceipt)
      .some((error) => /method component root/iu.test(error)),
    true,
  );

  const omittedReceiptHead = structuredClone(receipt);
  delete omittedReceiptHead.methodComponentRootSetHash;
  seal(omittedReceiptHead, "receiptHash");
  assert.equal(
    reviewGate.validateClaimBoundaryReviewReceiptShapeAndEvidenceV1(omittedReceiptHead, { rawReviewEvidence: raw }, independentReviewReceipt)
      .some((error) => /method component root/iu.test(error)),
    true,
  );

  const substitutedReceiptHead = structuredClone(receipt);
  substitutedReceiptHead.methodComponentRootSetHash = "0".repeat(64);
  seal(substitutedReceiptHead, "receiptHash");
  assert.equal(
    reviewGate.validateClaimBoundaryReviewReceiptShapeAndEvidenceV1(substitutedReceiptHead, { rawReviewEvidence: raw }, independentReviewReceipt)
      .some((error) => /method component root/iu.test(error)),
    true,
  );
});

test("on-disk V4 registration rejects stale finite finding caps and freezes cardinality-based surface worlds", () => {
  const missingData = actualRegistration().analysis?.missingData;
  for (const staleField of [
    "finiteOperationalCodeCount",
    "maximumAdversarialFamilyFindingsPerNonresolvedItem",
    "maximumAdversarialExactFindingsPerNonresolvedItem",
    "maximumAdversarialP1FindingsPerNonresolvedItem",
    "maximumAdversarialP2FindingsPerNonresolvedItem",
  ]) {
    assert.equal(Object.hasOwn(missingData, staleField), false, `${staleField} is not a registered finding estimand`);
  }
  assert.match(missingData.findingMetricRule, /unidentified.*\[0,\s*1\]/iu);
  assert.doesNotMatch(missingData.itemMetricRule, /2\^r\s*\*\s*4\^m/iu);
  assert.match(missingData.itemMetricRule, /product\(per-item cardinality\).*machine.*reference|product\(per-item cardinality\).*reference.*machine/iu);
  assert.match(missingData.itemMetricRule, /maximum\s+64/iu);
});

test("A11 review accepts authorization roots only from the out-of-band review context", () => {
  const validate = requiredFunction("validateOutOfBandTrustedAuthorizationRootsV4");
  const fixture = trustedAuthorizationFixtureV4();
  assert.deepEqual(validate(fixture.raw, fixture.trustedAuthorizationRoots), []);

  const callerSupplied = structuredClone(fixture);
  callerSupplied.raw.trustedAuthorizationRoots = structuredClone(callerSupplied.trustedAuthorizationRoots);
  assert.equal(validate(callerSupplied.raw, callerSupplied.trustedAuthorizationRoots).some((error) => /protected evidence.*supply/iu.test(error)), true);

  const staleTrustedRoot = structuredClone(fixture);
  staleTrustedRoot.trustedAuthorizationRoots.deepSeek.authorizationHash = "0".repeat(64);
  assert.equal(validate(staleTrustedRoot.raw, staleTrustedRoot.trustedAuthorizationRoots).some((error) => /DeepSeek.*trusted.*root/iu.test(error)), true);

  const absentRouteRoot = structuredClone(fixture);
  delete absentRouteRoot.trustedAuthorizationRoots.routeProbe;
  assert.equal(validate(absentRouteRoot.raw, absentRouteRoot.trustedAuthorizationRoots).some((error) => /route-probe.*trusted.*root/iu.test(error)), true);
});

test("A11 independent verifier source ban includes every V4 main C0 summary scorer and decision function", () => {
  for (const forbidden of [
    "recomputeC0TriggerInputFromProtectedItemV4",
    "deriveC0TriggerDecision",
    "deriveC0ExecutionSetV4",
    "deriveFinalReceiptSummariesV4",
    "recomputeMetricSet",
    "deriveOverallDecision",
  ]) {
    assert.equal(reviewGate.FORBIDDEN_INDEPENDENT_VERIFIER_IMPORT_PATTERNS.includes(forbidden), true, forbidden);
  }
});

test("A11 V4 accounting accepts 57-59 complete plus hash-bound missing bundles and rejects a fourth missing item", () => {
  const validate = requiredFunction("validateV4DeepSeekItemAccountingForReview");
  for (const missingCount of [1, 2, 3]) {
    assert.deepEqual(validate(missingReceiptAccountingFixtureV4(missingCount)), [], `${60 - missingCount}/60 complete`);
  }
  const fullBundleDisposition = missingReceiptAccountingFixtureV4(1);
  delete fullBundleDisposition.deepSeekCompleteItemBundles[0].executionDisposition;
  fullBundleDisposition.deepSeekCompleteItemBundles[0].itemResult = { executionDisposition: "COMPLETE" };
  assert.deepEqual(validate(fullBundleDisposition), [], "full item bundles carry COMPLETE in the sealed item result");
  assert.equal(validate(missingReceiptAccountingFixtureV4(4)).some((error) => /57|three|integrity/iu.test(error)), true);

  const fabricatedFinding = missingReceiptAccountingFixtureV4(3);
  fabricatedFinding.deepSeekMissingReceiptItemBundles[0].machineFindings = [];
  seal(fabricatedFinding.deepSeekMissingReceiptItemBundles[0], "missingReceiptBundleHash");
  assert.equal(validate(fabricatedFinding).some((error) => /missing receipt.*machine finding|forbidden/iu.test(error)), true);

  const overlap = missingReceiptAccountingFixtureV4(3);
  overlap.deepSeekCompleteItemBundles[0] = {
    ...overlap.deepSeekCompleteItemBundles[0],
    ...overlap.deepSeekMissingReceiptItemBundles[0],
    executionDisposition: "COMPLETE",
  };
  assert.equal(validate(overlap).some((error) => /identity|partition|exactly once/iu.test(error)), true);

  const substitutedManifestRows = missingReceiptAccountingFixtureV4(3);
  substitutedManifestRows.sampleManifestRows[0].itemIdPseudonym = "caller-self-consistent-substitution";
  substitutedManifestRows.deepSeekCompleteItemBundles[0].itemIdPseudonym = "caller-self-consistent-substitution";
  assert.equal(validate(substitutedManifestRows).some((error) => /authoritative|sample manifest|selectedRows/iu.test(error)), true);
});

test("IndependentReviewReceipt CONCURRED path executes V4 missing-receipt accounting instead of bypassing the helper", () => {
  const raw = protectedStageContextV4();
  const upstream = {
    registrationHash: raw.executionRegistration.registrationHash,
    sampleManifestHash: raw.executionRegistration.sampleManifestHash,
    executionRegistrationHash: raw.executionRegistration.executionRegistrationHash,
    frameRegistrationHash: raw.frameRegistration.frameRegistrationHash,
    sampleManifest: raw.sampleManifest,
  };
  const accounting = missingReceiptAccountingFixtureV4(3, upstream);
  Object.assign(raw.executionEvidence, accounting);
  const c0 = protectedC0FixtureV4(upstream);
  Object.assign(raw.executionEvidence, {
    sampleManifestRows: c0.sampleRows,
    registeredRandomAuditRows: c0.registeredRandomAuditRows,
    c0ProtectedItemBundles: c0.protectedItemBundles,
    c0TriggerInputs: c0.sealedTriggerInputs,
    c0TriggerDecisions: c0.sealedTriggerDecisions,
    c0ExecutionSet: c0.sealedExecutionSet,
    deepSeekSuccessfulCallCap: c0.deepSeekSuccessfulCallCap,
  });
  const trusted = trustedAuthorizationFixtureV4();
  raw.executionEvidence.referenceExecutionBundle.authorization = trusted.raw.executionEvidence.referenceExecutionBundle.authorization;
  raw.executionEvidence.deepSeekAuthorization = trusted.raw.executionEvidence.deepSeekAuthorization;
  raw.executionEvidence.routeProbeAuthorization = trusted.raw.executionEvidence.routeProbeAuthorization;
  const receipt = seal({
    schemaVersion: "IndependentReviewReceiptV1",
    designId: designContract.DESIGN_ID,
    reviewStatus: "CONCURRED",
    discrepancyCodes: [],
    unreviewableReason: null,
  }, "receiptHash");
  const validErrors = TEST_FIXTURE_ONLY_REVIEW_GATE.validateIndependentReviewReceiptV1(receipt, {
    rawReviewEvidence: raw,
    trustedAuthorizationRoots: trusted.trustedAuthorizationRoots,
  });
  assert.equal(validErrors.some((error) => /A11 V4 DeepSeek item accounting/u.test(error)), false, validErrors.join("\n"));
  assert.equal(validErrors.some((error) => /A11 protected C0 recomputation/u.test(error)), false, validErrors.join("\n"));
  assert.equal(validErrors.some((error) => /trusted out-of-band root|trusted authorization roots/iu.test(error)), false, validErrors.join("\n"));

  const staleTrustedRoots = structuredClone(trusted.trustedAuthorizationRoots);
  staleTrustedRoots.qwen.authorizationHash = "0".repeat(64);
  const staleTrustedErrors = TEST_FIXTURE_ONLY_REVIEW_GATE.validateIndependentReviewReceiptV1(receipt, {
    rawReviewEvidence: raw,
    trustedAuthorizationRoots: staleTrustedRoots,
  });
  assert.equal(staleTrustedErrors.some((error) => /trusted out-of-band root/iu.test(error)), true);

  const mutatedC0 = structuredClone(raw);
  mutatedC0.executionEvidence.c0ProtectedItemBundles[12].bPrimeRevision.finalFindingKeys = ["MUTATED_AFTER_EXECUTION"];
  const mutatedC0Errors = TEST_FIXTURE_ONLY_REVIEW_GATE.validateIndependentReviewReceiptV1(receipt, {
    rawReviewEvidence: mutatedC0,
    trustedAuthorizationRoots: trusted.trustedAuthorizationRoots,
  });
  assert.equal(mutatedC0Errors.some((error) => /A11 protected C0 recomputation/u.test(error)), true);

  const callerPreassembledC0 = structuredClone(raw);
  callerPreassembledC0.c0ReviewEvidence = structuredClone(c0);
  const callerPreassembledErrors = TEST_FIXTURE_ONLY_REVIEW_GATE.validateIndependentReviewReceiptV1(receipt, {
    rawReviewEvidence: callerPreassembledC0,
    trustedAuthorizationRoots: trusted.trustedAuthorizationRoots,
  });
  assert.equal(callerPreassembledErrors.some((error) => /caller-preassembled c0ReviewEvidence substitute/u.test(error)), true);

  Object.assign(raw.executionEvidence, missingReceiptAccountingFixtureV4(4, upstream));
  const invalidErrors = TEST_FIXTURE_ONLY_REVIEW_GATE.validateIndependentReviewReceiptV1(receipt, {
    rawReviewEvidence: raw,
    trustedAuthorizationRoots: trusted.trustedAuthorizationRoots,
  });
  assert.equal(invalidErrors.some((error) => /A11 V4 DeepSeek item accounting/u.test(error)), true);
});

test("A11 independently rebuilds all 60 C0 trigger inputs and the exact random-12 union mandatory set", () => {
  const validate = requiredFunction("validateA11C0ReviewEvidenceV4");
  const evidence = protectedC0FixtureV4();
  assert.deepEqual(validate(evidence), []);
  assert.equal(evidence.sealedExecutionSet.triggerDecisionCount, 60);
  assert.equal(evidence.sealedExecutionSet.uniqueC0ItemCount, 13);

  const missingBundle = structuredClone(evidence);
  missingBundle.protectedItemBundles.pop();
  assert.equal(validate(missingBundle).some((error) => /60 protected C0 item bundles/u.test(error)), true);

  const mutatedBPrime = structuredClone(evidence);
  mutatedBPrime.protectedItemBundles[12].bPrimeRevision.finalFindingKeys = ["MUTATED_AFTER_EXECUTION"];
  assert.equal(validate(mutatedBPrime).some((error) => /trigger input|execution set|protected C0/u.test(error)), true);

  const omittedMandatory = structuredClone(evidence);
  omittedMandatory.sealedExecutionSet.c0Rows = omittedMandatory.sealedExecutionSet.c0Rows
    .filter(({ clusterId }) => clusterId !== "c-13");
  seal(omittedMandatory.sealedExecutionSet, "executionSetHash");
  assert.equal(validate(omittedMandatory).some((error) => /execution set/u.test(error)), true);
});

test("standalone C0 execution rejects duplicate itemHash before identity maps are constructed", () => {
  const evidence = protectedC0FixtureV4();
  evidence.sampleRows[1].itemHash = evidence.sampleRows[0].itemHash;
  assert.throws(() => designContract.deriveC0ExecutionSetV4({
    registrationHash: evidence.registrationHash,
    sampleManifestHash: evidence.sampleManifestHash,
    executionRegistrationHash: evidence.executionRegistrationHash,
    sampleRows: evidence.sampleRows,
    registeredRandomAuditRows: evidence.registeredRandomAuditRows,
    triggerInputs: evidence.sealedTriggerInputs,
    deepSeekSuccessfulCallCap: evidence.deepSeekSuccessfulCallCap,
  }), /duplicate itemHash.*before.*map|duplicate.*itemHash/iu);
});

test("A11 final-summary recomputation fails closed on every missing or mutated source summary", () => {
  const validate = requiredFunction("validateA11FinalReceiptSummariesV4");
  const evidence = finalSummaryFixtureV4();
  assert.deepEqual(validate(evidence), []);

  for (const field of [
    "matchingMatrix",
    "strata",
    "clusterWeights",
    "kishEffectiveSampleSize",
    "agreement",
    "adjudicationCount",
  ]) {
    const missing = structuredClone(evidence);
    delete missing.sourceEvidence[field];
    assert.equal(validate(missing).length > 0, true, `${field} must fail closed when absent`);
  }
  for (const field of [
    "matchingMatrixHash",
    "matchingMatrix",
    "strataSummaryHash",
    "strataSummary",
    "clusterWeightSummaryHash",
    "clusterWeightSummary",
    "kishEffectiveSampleSize",
    "agreementSummaryHash",
    "agreementSummary",
    "adjudicationSummary",
    "finalSummaryRootHash",
  ]) {
    const missing = structuredClone(evidence);
    delete missing.finalReceipt[field];
    assert.equal(validate(missing).length > 0, true, `final receipt ${field} must fail closed when absent`);
  }

  const mutated = structuredClone(evidence);
  mutated.sourceEvidence.matchingMatrix.push({ referenceFindingId: "r2", machineFindingId: null, matchType: "UNMATCHED" });
  assert.equal(validate(mutated).some((error) => /final receipt summaries/u.test(error)), true);
});
