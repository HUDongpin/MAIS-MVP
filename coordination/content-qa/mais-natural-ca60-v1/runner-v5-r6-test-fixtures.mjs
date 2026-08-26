import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
} from "./execution-integrity-v5-r3.mjs";
import V5_R5_REGISTRATION from "../../research/mais-natural-ca60-v1/runner-registrations/v5-r5/runner-registration.json" with { type: "json" };
import {
  buildAuthorizationFixtureV5R4,
  buildRunnerFixtureV5R4,
} from "./runner-v5-r4-test-fixtures.mjs";
import {
  buildProviderRequestArtifactV5R6,
  buildResolvedProviderAuthorizationV5R6,
} from "./provider-request-v5-r6.mjs";
import {
  computeClosureKernelsV5R6,
  PRODUCTION_ENTRYPOINTS_V5_R6,
  V5_R5_A11_REVIEW_HASH,
  V5_R5_A11_REVIEW_COMMIT,
  V5_R5_A11_REVIEW_INTEGRATION_COMMIT,
  V5_R5_REGISTRATION_COMMIT,
  V5_R5_REGISTRATION_HASH,
  V5_R5_SOURCE_COMMIT,
  V5_R6_OWNER_RUNNER_IMPLEMENTATION_AUTHORIZATION_TEXT_HASH,
} from "./execution-evidence-v5-r6.mjs";
import {
  sourceManifestRootV5R6,
} from "./source-closure-v5-r6.mjs";
import {
  buildExternallyAttestedRouteEvidenceV5R6,
  buildProtectedProviderEvidenceArtifactV5R6,
  buildRouteEvidenceCaptureReceiptV5R6,
} from "./route-evidence-custody-v5-r6.mjs";
import {
  buildOwnerRunnerActivationGrantV5R5,
} from "./activation-guard-v5-r5.mjs";
import {
  buildStateBoundDispatchAuditV5R6,
} from "./guarded-provider-attempt-v5-r6.mjs";

export const H_V5_R6 = (value) => sha256V5R3(String(value));

const ROOT_V5_R6 = "coordination/content-qa/mais-natural-ca60-v1/";
const NON_AUTHORIZATIONS_V5_R6 = Object.freeze([
  "NO_DEPLOYMENT",
  "NO_LIVE_QUESTION_BANK_MUTATION",
  "NO_GIT_MUTATION",
  "NO_MODEL_FALLBACK",
  "NO_BUDGET_TRANSFER",
  "NO_PROMPT_TUNING",
  "NO_RESULT_DEPENDENT_REPLACEMENT",
]);

function componentHash(manifest, sourcePaths) {
  const expected = [...new Set(sourcePaths)].sort();
  const selected = manifest.filter(({ path }) => expected.includes(path));
  return sha256V5R3(canonicalJsonV5R3(selected));
}

function buildFixtureReferenceSealV5R6({ activeRegistration, freshReview, inventory,
  compatibilityReferenceSealHash, referenceAttemptChainHash }) {
  return sealV5R3Artifact({
    schemaVersion: "MachineReferenceSealV5",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash: activeRegistration.selfHash,
    freshRunnerReviewHash: freshReview.selfHash,
    compatibilityRunnerRegistrationHash: V5_R5_REGISTRATION.selfHash,
    compatibilityReferenceSealHash,
    openAIReferenceAuthorizationHash: H_V5_R6("fixture-outer-openai-reference-authorization"),
    compatibilityOpenAIReferenceAuthorizationHash: H_V5_R6("fixture-inner-openai-reference-authorization"),
    sampleExecutionInventoryHash: inventory.selfHash,
    sampleManifestHash: activeRegistration.sampleManifestHash,
    samplePayloadSetHash: activeRegistration.samplePayloadSetHash,
    provider: "OPENAI_DIRECT",
    model: "gpt-5.6-luna",
    endpoint: "https://us.api.openai.com/v1/responses",
    labelSourceType: "machine_reference_panel",
    humanGold: false,
    sameModelCorrelatedErrorRisk: true,
    itemCount: 60,
    totalSuccessfulCallCount: 240,
    totalAttemptCount: 240,
    providerEventCountAtSeal: 240,
    executionLedgerTerminalHash: H_V5_R6("fixture-reference-ledger-terminal"),
    attemptChainHash: referenceAttemptChainHash,
    finalLabelRoot: H_V5_R6("fixture-final-label-root"),
    unresolvedCount: 0,
    unresolvedWithinExecutionCap: true,
    labelBlindnessVerified: true,
    sealReconstructionStatus: "FULL_COMPATIBILITY_LEDGER_RECONSTRUCTION_BOUND_TO_R6",
    sealedAt: "2026-08-26T08:14:00.000Z",
  });
}

function buildFixtureReferenceValidationV5R6({ activeRegistration, freshReview, inventory,
  referenceSeal }) {
  return sealV5R3Artifact({
    schemaVersion: "ReferenceSealValidationReceiptV3",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash: activeRegistration.selfHash,
    freshRunnerReviewHash: freshReview.selfHash,
    referenceSealHash: referenceSeal.selfHash,
    compatibilityReferenceSealHash: referenceSeal.compatibilityReferenceSealHash,
    openAIReferenceAuthorizationHash: referenceSeal.openAIReferenceAuthorizationHash,
    compatibilityOpenAIReferenceAuthorizationHash: referenceSeal.compatibilityOpenAIReferenceAuthorizationHash,
    sampleExecutionInventoryHash: inventory.selfHash,
    referenceAttemptChainHash: referenceSeal.attemptChainHash,
    referenceLedgerTerminalHash: referenceSeal.executionLedgerTerminalHash,
    finalLabelRoot: referenceSeal.finalLabelRoot,
    itemCount: 60,
    labelBlindnessVerified: true,
    sameModelCorrelatedErrorRisk: true,
    validationStatus: "FULL_RAW_LEDGER_RECONSTRUCTION_VALID_AND_BOUND_TO_R6",
    validatedAt: "2026-08-26T08:15:00.000Z",
  });
}

export function buildActiveRunnerRegistrationFixtureV5R6() {
  const productionPaths = [...new Set([
    ...PRODUCTION_ENTRYPOINTS_V5_R6,
    `${ROOT_V5_R6}schemas/FixtureTransitiveSchema.schema.json`,
  ])].sort();
  const productionSourceManifest = productionPaths.map((sourcePath) => ({
    path: sourcePath,
    byteLength: 100 + sourcePath.length,
    sha256: H_V5_R6(`fixture-production:${sourcePath}`),
  }));
  const testSourceManifest = [{
    path: `${ROOT_V5_R6}runner-v5-r6-offline.test.mjs`,
    byteLength: 777,
    sha256: H_V5_R6("fixture-test-source"),
  }];
  const coreGuardHash = componentHash(productionSourceManifest, [
    `${ROOT_V5_R6}activation-guard-v5-r6.mjs`,
    `${ROOT_V5_R6}guarded-provider-attempt-v5-r6.mjs`,
    `${ROOT_V5_R6}provider-request-v5-r6.mjs`,
  ]);
  return sealV5R3Artifact({
    schemaVersion: "NaturalCaExecutionRunnerSupersedingRegistrationV2",
    runnerVersion: "V5-R6",
    designId: "MAIS-NATURAL-CA60-V5",
    registeredAt: "2026-08-26T08:00:00.000Z",
    supersedesRunnerRegistrationHash: V5_R5_REGISTRATION_HASH,
    supersededRunnerRegistrationCommit: V5_R5_REGISTRATION_COMMIT,
    supersededRunnerSourceCommit: V5_R5_SOURCE_COMMIT,
    discrepancyReviewHash: V5_R5_A11_REVIEW_HASH,
    discrepancyReviewCommit: V5_R5_A11_REVIEW_COMMIT,
    integratedDiscrepancyReviewCommit: V5_R5_A11_REVIEW_INTEGRATION_COMMIT,
    previousReceiptHash: V5_R5_A11_REVIEW_HASH,
    ownerRunnerImplementationAuthorizationTextHash: V5_R6_OWNER_RUNNER_IMPLEMENTATION_AUTHORIZATION_TEXT_HASH,
    ...Object.fromEntries([
      "designRegistrationHash", "frameRegistrationHash", "samplingFrameHash", "sampleManifestHash",
      "samplePayloadSetHash", "sampleSelectionContentRootHash", "c0RandomAuditHash", "privacyScreenHash",
      "rightsScreenHash", "ownerDecisionRequestHash", "ownerDecisionReceiptHash", "rightsPolicyHash",
      "lineageRuleHash", "taxonomyHash", "labelingAndAdjudicationHash", "thresholdsDecisionAndPowerHash",
      "decisionCeiling", "providerContractErratumHash",
    ].map((field) => [field, V5_R5_REGISTRATION[field]])),
    runnerSourceCommit: "c".repeat(40),
    productionEntryPoints: [...PRODUCTION_ENTRYPOINTS_V5_R6],
    productionSourceManifest,
    productionSourceRootHash: sourceManifestRootV5R6(productionSourceManifest),
    productionImportEdgeCount: 1,
    importClosureRootHash: H_V5_R6("fixture-import-closure"),
    testSourceManifest,
    testSourceRootHash: sourceManifestRootV5R6(testSourceManifest),
    supersededProductionSourceRootHash: V5_R5_REGISTRATION.productionSourceRootHash,
    supersededTestSourceRootHash: V5_R5_REGISTRATION.testSourceRootHash,
    sourceClosureMode: "FULL_TRANSITIVE_RUNTIME_CLOSURE_CURRENT_BYTES_VERIFIED",
    registrationPathPolicy: "IMMUTABLE_SINGLE_ADD_COMMIT_NO_LATER_TOUCH",
    closureKernels: computeClosureKernelsV5R6(productionSourceManifest),
    providerEntrypoints: {
      openAI: {
        provider: "OPENAI_DIRECT",
        model: "gpt-5.6-luna",
        endpoint: "https://us.api.openai.com/v1/responses",
        projectResidency: "US_STORAGE_PROCESSING",
        registeredCli: "runner-v5-r6-cli.mjs",
        coreGuardHash,
        providerCallsMade: 0,
      },
      deepSeek: {
        provider: "DEEPSEEK_DIRECT",
        model: "deepseek-v4-pro",
        endpoint: "https://api.deepseek.com/chat/completions",
        projectResidency: "UNRESOLVED",
        registeredCli: "runner-v5-r6-cli.mjs",
        coreGuardHash,
        providerCallsMade: 0,
      },
    },
    authorizationState: {
      credentialReadAuthorized: false,
      providerExecutionAuthorized: false,
      naturalQuestionEgressAuthorized: false,
      tokenAuthorizationCreated: false,
      attemptAuthorizationCreated: false,
      usdAuthorizationCreated: false,
      credentialReadCount: 0,
      providerEventCount: 0,
      naturalQuestionEgressCount: 0,
      tokenCount: 0,
      attemptCount: 0,
      usdSpent: 0,
      referenceLabelCount: 0,
      naturalQuestionResultCount: 0,
    },
    status: "OFFLINE_IMPLEMENTED_PENDING_FRESH_A11_V5_R6_REVIEW_PROVIDER_EXECUTION_BLOCKED",
    claimCeiling: "FRAME_AND_SAMPLE_FROZEN_RUNNER_OFFLINE_IMPLEMENTED_NOT_EXECUTED",
  });
}

export function buildResolvedActivationFixtureV5R6(provider = "OPENAI_DIRECT") {
  const core = buildRunnerFixtureV5R4();
  const activeRegistration = buildActiveRunnerRegistrationFixtureV5R6();
  const registrationCommit = "d".repeat(40);
  const registrationEvidence = sealV5R3Artifact({
    schemaVersion: "ExactRunnerSupersedingRegistrationEvidenceV2",
    registrationCommit,
    registrationPath: "coordination/research/mais-natural-ca60-v1/runner-registrations/v5-r6/runner-registration.json",
    registrationPathMutationCount: 1,
    registrationHash: activeRegistration.selfHash,
    runnerSourceCommit: activeRegistration.runnerSourceCommit,
    productionSourceRootHash: activeRegistration.productionSourceRootHash,
    testSourceRootHash: activeRegistration.testSourceRootHash,
    importClosureRootHash: activeRegistration.importClosureRootHash,
    supersededRunnerRegistrationHash: V5_R5_REGISTRATION_HASH,
    discrepancyReviewHash: V5_R5_A11_REVIEW_HASH,
    verifiedFromGitObjects: true,
    currentRuntimeBytesMatchRegisteredSource: true,
    immutableSingleAddPathVerified: true,
    activeRegistration,
  });
  const freshReview = sealV5R3Artifact({
    schemaVersion: "IndependentExecutionRunnerReviewReceiptV4",
    designId: "MAIS-NATURAL-CA60-V5",
    runnerVersion: "V5-R6",
    reviewedAt: "2026-08-26T08:10:00.000Z",
    decision: "CONCURRED",
    reviewerLane: "A11",
    independentImplementation: true,
    findingCount: 0,
    reviewedRunnerRegistrationHash: activeRegistration.selfHash,
    reviewedRunnerRegistrationCommit: registrationCommit,
    reviewedRunnerSourceCommit: activeRegistration.runnerSourceCommit,
    reviewedProductionSourceRootHash: activeRegistration.productionSourceRootHash,
    reviewedTestSourceRootHash: activeRegistration.testSourceRootHash,
    reviewedImportClosureRootHash: activeRegistration.importClosureRootHash,
  });
  const referenceAttemptChainHash = provider === "DEEPSEEK_DIRECT"
    ? H_V5_R6("fixture-reference-chain") : null;
  const compatibilityReferenceSeal = provider === "DEEPSEEK_DIRECT"
    ? sealV5R3Artifact({ schemaVersion: "FixtureCompatibilityReferenceSealV1", fixture: true }) : null;
  const compatibility = buildAuthorizationFixtureV5R4(core, provider, provider === "DEEPSEEK_DIRECT" ? {
    referenceSealHash: compatibilityReferenceSeal.selfHash,
    referenceAttemptChainHash,
  } : {});
  const referenceSeal = provider === "DEEPSEEK_DIRECT" ? buildFixtureReferenceSealV5R6({
    activeRegistration,
    freshReview,
    inventory: core.inventory,
    compatibilityReferenceSealHash: compatibilityReferenceSeal.selfHash,
    referenceAttemptChainHash,
  }) : null;
  const referenceSealValidationReceipt = provider === "DEEPSEEK_DIRECT"
    ? buildFixtureReferenceValidationV5R6({ activeRegistration, freshReview, inventory: core.inventory,
      referenceSeal }) : null;
  const tuple = provider === "OPENAI_DIRECT" ? {
    model: "gpt-5.6-luna",
    endpoint: "https://us.api.openai.com/v1/responses",
    projectResidency: "US_STORAGE_PROCESSING",
    dataRegion: "US",
  } : {
    model: "deepseek-v4-pro",
    endpoint: "https://api.deepseek.com/chat/completions",
    projectResidency: "US_CONTRACTED_PROCESSING",
    dataRegion: "US",
  };
  const routeCommon = {
    activeRunnerRegistrationHash: activeRegistration.selfHash,
    provider,
    ...tuple,
    capturedAt: "2026-08-26T08:11:00.000Z",
  };
  const routeKinds = [
    ["ACCOUNT_PROJECT_IDENTITY", "PROVIDER_CONSOLE_EXPORT"],
    ["DIRECT_BILLING_ROUTE", "PROVIDER_BILLING_EXPORT"],
    ["DATA_REGION", "PROVIDER_CONSOLE_EXPORT"],
    ["PRICE", "PROVIDER_OFFICIAL_RATE_CARD"],
    ["ROUTE_PROBE_RESPONSE", "GUARDED_ZERO_CONTENT_ROUTE_PROBE"],
  ];
  const rawSourceArtifacts = routeKinds.map(([evidenceKind, sourceKind]) =>
    buildProtectedProviderEvidenceArtifactV5R6({
      ...routeCommon,
      evidenceKind,
      sourceKind,
      sourceLocatorHash: H_V5_R6(`fixture-route-locator:${provider}:${evidenceKind}`),
      rawSourceBody: JSON.stringify({ provider, evidenceKind, sourceKind, fixture: "offline non-secret" }),
    }));
  const captures = routeKinds.map(([evidenceKind, sourceKind], index) =>
    buildRouteEvidenceCaptureReceiptV5R6({
      ...routeCommon,
      subjectIdentityHash: compatibility.authorization.projectIdentityHash,
      evidenceKind,
      sourceKind,
      rawSourceArtifact: rawSourceArtifacts[index],
      captureLane: evidenceKind === "ROUTE_PROBE_RESPONSE" ? "A07" : "A19",
      authenticatedSessionEvidenceHash: H_V5_R6(`fixture-session:${provider}:${evidenceKind}`),
      ownerAttestationReceiptHash: H_V5_R6(`fixture-attestation:${provider}:${evidenceKind}`),
      guardedProviderEventReceiptHash: evidenceKind === "ROUTE_PROBE_RESPONSE"
        ? H_V5_R6(`fixture-probe-event:${provider}`) : null,
      zeroNaturalContentRequestHash: evidenceKind === "ROUTE_PROBE_RESPONSE"
        ? H_V5_R6(`fixture-zero-content:${provider}`) : null,
      expiresAt: "2026-08-27T08:11:00.000Z",
    }));
  const authenticatedRouteEvidence = buildExternallyAttestedRouteEvidenceV5R6({
    ...routeCommon,
    subjectIdentityHash: compatibility.authorization.projectIdentityHash,
    captures,
    rawSourceArtifacts,
    directBillingConfirmed: true,
    inputUsdPerMillionTokens: compatibility.priceSnapshot.inputUsdPerMillionTokens,
    outputUsdPerMillionTokens: compatibility.priceSnapshot.outputUsdPerMillionTokens,
    validatedAt: "2026-08-26T08:12:00.000Z",
  });
  const authorization = buildResolvedProviderAuthorizationV5R6({
    activeRunnerRegistrationHash: activeRegistration.selfHash,
    freshRunnerReviewHash: freshReview.selfHash,
    authenticatedRouteEvidenceHash: authenticatedRouteEvidence.selfHash,
    referenceSealHash: referenceSeal?.selfHash ?? null,
    referenceAttemptChainHash,
    provider,
    ...tuple,
    projectIdentityHash: compatibility.authorization.projectIdentityHash,
    compatibilityAuthorization: compatibility.authorization,
    credentialReadAuthorized: true,
    providerExecutionAuthorized: true,
    naturalQuestionEgressAuthorized: true,
    tokenAuthorizationCreated: true,
    attemptAuthorizationCreated: true,
    usdAuthorizationCreated: true,
    maximumAttempts: compatibility.authorization.maximumAttempts,
    maximumSuccessfulCalls: compatibility.authorization.maximumSuccessfulCalls,
    maximumInputTokens: compatibility.authorization.maximumInputTokens,
    maximumOutputTokens: compatibility.authorization.maximumOutputTokens,
    maximumTokens: compatibility.authorization.maximumTokens,
    maximumEstimatedUsd: compatibility.authorization.maximumEstimatedUsd,
    concurrencyCap: compatibility.authorization.concurrencyCap,
    maximumAttemptsPerItemRole: 2,
    issuedAt: "2026-08-26T08:20:00.000Z",
    expiresAt: "2026-08-27T08:20:00.000Z",
    authorizedBy: "FIXTURE_OWNER_NOT_LIVE_AUTHORITY",
    ownerAuthorizationTextHash: H_V5_R6(`fixture-owner-provider-grant:${provider}`),
  });
  const costPreview = sealV5R3Artifact({
    schemaVersion: "ProviderCostPreviewReceiptV1",
    activeRunnerRegistrationHash: activeRegistration.selfHash,
    provider,
    maximumAttempts: authorization.maximumAttempts,
    maximumSuccessfulCalls: authorization.maximumSuccessfulCalls,
    maximumInputTokens: authorization.maximumInputTokens,
    maximumOutputTokens: authorization.maximumOutputTokens,
    maximumTokens: authorization.maximumTokens,
    maximumEstimatedUsd: authorization.maximumEstimatedUsd,
  });
  const ownerActivationGrant = buildOwnerRunnerActivationGrantV5R5({
    activeRunnerRegistrationHash: activeRegistration.selfHash,
    compatibilityBaseRunnerRegistrationHash: core.registration.selfHash,
    freshRunnerReviewHash: freshReview.selfHash,
    providerAuthorizationHash: authorization.selfHash,
    authenticatedRouteEvidenceHash: authenticatedRouteEvidence.selfHash,
    costPreviewHash: costPreview.selfHash,
    sampleExecutionInventoryHash: core.inventory.selfHash,
    ownerAuthorizationTextHash: H_V5_R6(`fixture-owner-activation:${provider}`),
    provider,
    ...tuple,
    resolvedDataRegion: tuple.dataRegion,
    resolvedProjectResidency: tuple.projectResidency,
    maximumAttempts: authorization.maximumAttempts,
    maximumSuccessfulCalls: authorization.maximumSuccessfulCalls,
    maximumInputTokens: authorization.maximumInputTokens,
    maximumOutputTokens: authorization.maximumOutputTokens,
    maximumTokens: authorization.maximumTokens,
    maximumEstimatedUsd: authorization.maximumEstimatedUsd,
    nonAuthorizations: [...NON_AUTHORIZATIONS_V5_R6],
    authorizedBy: "FIXTURE_OWNER_NOT_LIVE_AUTHORITY",
    issuedAt: "2026-08-26T08:21:00.000Z",
    expiresAt: "2026-08-27T08:21:00.000Z",
  });
  const executionRegistration = provider === "DEEPSEEK_DIRECT" ? sealV5R3Artifact({
    schemaVersion: "DeepSeekExecutionRegistrationV4",
    designId: "MAIS-NATURAL-CA60-V5",
    registeredAt: "2026-08-26T08:25:00.000Z",
    activeRunnerRegistrationHash: activeRegistration.selfHash,
    freshRunnerReviewHash: freshReview.selfHash,
    deepSeekAuthorizationHash: authorization.selfHash,
    authenticatedRouteEvidenceHash: authenticatedRouteEvidence.selfHash,
    costPreviewHash: costPreview.selfHash,
    referenceSealHash: referenceSeal.selfHash,
    referenceSealValidationReceiptHash: referenceSealValidationReceipt.selfHash,
    referenceAttemptChainHash: referenceSeal.attemptChainHash,
    referenceLedgerTerminalHash: referenceSeal.executionLedgerTerminalHash,
    finalLabelRoot: referenceSeal.finalLabelRoot,
    sampleExecutionInventoryHash: core.inventory.selfHash,
    frameRegistrationHash: activeRegistration.frameRegistrationHash,
    sampleManifestHash: activeRegistration.sampleManifestHash,
    c0RandomAuditHash: activeRegistration.c0RandomAuditHash,
    provider: "DEEPSEEK_DIRECT",
    model: "deepseek-v4-pro",
    endpoint: "https://api.deepseek.com/chat/completions",
    resolvedProjectResidency: authorization.projectResidency,
    resolvedDataRegion: authorization.dataRegion,
    adapterHash: authorization.compatibilityAuthorization.providerImplementationHash,
    decisionCeiling: "INCONCLUSIVE_MACHINE_REFERENCE",
    passClaimAllowed: false,
    limitedGeneralizationEvidenceAllowed: false,
  }) : null;
  return {
    ...core,
    registrationEvidence,
    activeRegistration,
    freshReview,
    authenticatedRouteEvidence,
    authorization,
    costPreview,
    ownerActivationGrant,
    priceSnapshot: compatibility.priceSnapshot,
    subjectIdentity: compatibility.subjectIdentity,
    executionRegistration,
    referenceSeal,
    referenceSealValidationReceipt,
    referenceAttemptChainHash,
    mode: provider === "OPENAI_DIRECT" ? "REFERENCE_RESUME" : "DEEPSEEK_CANARY",
    ledgerEntries: [],
    at: "2026-08-26T08:30:00.000Z",
  };
}

export function buildResolvedGuardedAttemptFixtureV5R6(provider = "OPENAI_DIRECT") {
  const input = buildResolvedActivationFixtureV5R6(provider);
  const dispatchAudit = buildStateBoundDispatchAuditV5R6(input);
  const itemLeaf = input.itemLeaves.find((leaf) => {
    const row = input.sampleManifest.selectedRows[dispatchAudit.executionPlan.manifestOrdinal - 1];
    return leaf.itemId === row.itemId;
  });
  const requestArtifact = buildProviderRequestArtifactV5R6({
    activeRegistration: input.activeRegistration,
    authorization: input.authorization,
    registration: input.registration,
    inventory: input.inventory,
    sampleManifest: input.sampleManifest,
    itemLeaf,
    role: dispatchAudit.role,
    attemptId: dispatchAudit.attemptId,
    ledgerEntries: input.ledgerEntries,
  });
  return { ...input, dispatchAudit, requestArtifact, itemLeaf };
}

export function buildResolvedProviderAuthorizationFixtureV5R6(provider = "OPENAI_DIRECT", overrides = {}) {
  const core = buildRunnerFixtureV5R4();
  const compatibility = buildAuthorizationFixtureV5R4(core, provider, provider === "DEEPSEEK_DIRECT" ? {
    referenceSealHash: H_V5_R6("fixture-reference-seal"),
    referenceAttemptChainHash: H_V5_R6("fixture-reference-chain"),
  } : {});
  const tuple = provider === "OPENAI_DIRECT"
    ? { model: "gpt-5.6-luna", endpoint: "https://us.api.openai.com/v1/responses",
      projectResidency: "US_STORAGE_PROCESSING", dataRegion: "US" }
    : { model: "deepseek-v4-pro", endpoint: "https://api.deepseek.com/chat/completions",
      projectResidency: "US_CONTRACTED_PROCESSING", dataRegion: "US" };
  return buildResolvedProviderAuthorizationV5R6({
    activeRunnerRegistrationHash: H_V5_R6("fixture-active-r6"),
    freshRunnerReviewHash: H_V5_R6("fixture-fresh-r6-review"),
    authenticatedRouteEvidenceHash: H_V5_R6("fixture-authenticated-route"),
    referenceSealHash: provider === "DEEPSEEK_DIRECT"
      ? H_V5_R6("fixture-outer-reference-seal") : null,
    referenceAttemptChainHash: provider === "DEEPSEEK_DIRECT"
      ? H_V5_R6("fixture-reference-chain") : null,
    provider,
    ...tuple,
    ...overrides,
    projectIdentityHash: compatibility.authorization.projectIdentityHash,
    compatibilityAuthorization: compatibility.authorization,
    credentialReadAuthorized: true,
    providerExecutionAuthorized: true,
    naturalQuestionEgressAuthorized: true,
    tokenAuthorizationCreated: true,
    attemptAuthorizationCreated: true,
    usdAuthorizationCreated: true,
    maximumAttempts: compatibility.authorization.maximumAttempts,
    maximumSuccessfulCalls: compatibility.authorization.maximumSuccessfulCalls,
    maximumInputTokens: compatibility.authorization.maximumInputTokens,
    maximumOutputTokens: compatibility.authorization.maximumOutputTokens,
    maximumTokens: compatibility.authorization.maximumTokens,
    maximumEstimatedUsd: compatibility.authorization.maximumEstimatedUsd,
    concurrencyCap: compatibility.authorization.concurrencyCap,
    maximumAttemptsPerItemRole: 2,
    issuedAt: "2026-08-26T08:20:00.000Z",
    expiresAt: "2026-08-27T08:20:00.000Z",
    authorizedBy: "FIXTURE_OWNER_NOT_A_LIVE_AUTHORIZATION",
    ownerAuthorizationTextHash: H_V5_R6("fixture-owner-text-not-live"),
  });
}

export function buildResolvedProviderRequestFixtureV5R6(authorization) {
  const core = buildRunnerFixtureV5R4();
  const compatibility = buildAuthorizationFixtureV5R4(core, authorization.provider, authorization.provider === "DEEPSEEK_DIRECT" ? {
    referenceSealHash: H_V5_R6("fixture-reference-seal"),
    referenceAttemptChainHash: H_V5_R6("fixture-reference-chain"),
  } : {});
  if (compatibility.authorization.selfHash !== authorization.compatibilityAuthorizationHash) {
    throw new TypeError("fixture resolved authorization is not bound to the synthetic compatibility runner");
  }
  const activeRegistration = sealV5R3Artifact({
    schemaVersion: "FixtureActiveRunnerRegistrationV5R6",
    runnerVersion: "V5-R6",
    selfDescription: "synthetic fixture only",
  });
  const reboundActiveRegistration = { ...activeRegistration, selfHash: authorization.activeRunnerRegistrationHash };
  const role = authorization.provider === "OPENAI_DIRECT" ? "A_SOLVE" : "B_PRIME_CRITIQUE";
  const requestArtifact = buildProviderRequestArtifactV5R6({
    activeRegistration: reboundActiveRegistration,
    authorization,
    registration: core.registration,
    inventory: core.inventory,
    sampleManifest: core.sampleManifest,
    itemLeaf: core.itemLeaves[0],
    role,
    attemptId: `V5R6:FIXTURE:${authorization.provider}:1`,
    ledgerEntries: [],
  });
  return { ...core, activeRegistration: reboundActiveRegistration, authorization, requestArtifact,
    itemLeaf: core.itemLeaves[0], ledgerEntries: [] };
}
