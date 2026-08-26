import DESIGN from "../../research/mais-natural-ca60-v1/versions/design-v5/design-registration.json" with { type: "json" };
import V5_R3_REGISTRATION from "../../research/mais-natural-ca60-v1/runner-registrations/v5-r3/runner-registration.json" with { type: "json" };
import { calculateArtifactHash } from "../../research/mais-natural-ca60-v1/versions/design-v2/design-contract.mjs";
import {
  calculateFrozenNaturalItemLeafHashV4,
} from "../../research/mais-natural-ca60-v1/versions/design-v4/design-contract.mjs";
import {
  SAMPLE_ALGORITHM_VERSION,
  calculateManifestTupleRootV3,
  materializeSamplePseudonymFieldsV4,
} from "./sample-contract-v5.mjs";
import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  V5_R3_A11_REVIEW_COMMIT,
  V5_R3_A11_REVIEW_HASH,
} from "./execution-evidence-v5-r4.mjs";
import {
  buildRouteEvidenceBundleV1,
  frozenRouteProbeWireRequestV5R4,
  providerEgressPolicyV5R4,
  routeProbeWireHashV5R4,
  V5_R4_AUTHORIZATION_CONSTANTS,
} from "./route-authorization-v5-r4.mjs";
import { OPENAI_REFERENCE_ADAPTER_TRANSFORM_HASH_V5 } from "./openai-reference-adapter-v5.mjs";
import { DEEPSEEK_EVALUATION_ADAPTER_V5_R2_CONSTANTS } from "./deepseek-evaluation-adapter-v5-r2.mjs";

const NON_AUTHORIZATIONS = Object.freeze(["NO_DEPLOYMENT", "NO_LIVE_QUESTION_BANK_MUTATION", "NO_GIT_MUTATION", "NO_MODEL_FALLBACK", "NO_BUDGET_TRANSFER", "NO_PROMPT_TUNING", "NO_RESULT_DEPENDENT_REPLACEMENT"]);
const H = (value) => sha256V5R3(String(value));

function sourceRoot(rows) { return sha256V5R3(canonicalJsonV5R3(rows)); }
function itemRoots(items) {
  const ordered = [...items].sort((left, right) => left.itemHash < right.itemHash ? -1 : left.itemHash > right.itemHash ? 1 : 0);
  return {
    samplePayloadSetHash: sha256V5R3(canonicalJsonV5R3(ordered.map(({ itemHash }) => itemHash))),
    privacyScreenHash: sha256V5R3(canonicalJsonV5R3(ordered.map(({ itemHash, privacyScreenEvidenceHash }) => [itemHash, privacyScreenEvidenceHash]))),
    rightsScreenHash: sha256V5R3(canonicalJsonV5R3(ordered.map(({ itemHash, rightsScreenEvidenceHash }) => [itemHash, rightsScreenEvidenceHash]))),
  };
}

function localized(en) { return { en, zh: `測試 ${en}` }; }

export function buildSyntheticNaturalLeavesV5R4() {
  const responseForms = ["multiple-choice", "fill-in", "short-answer"];
  const difficulties = ["Low", "Medium", "High"];
  return Array.from({ length: 60 }, (_, index) => {
    const responseForm = responseForms[index % responseForms.length];
    const difficulty = difficulties[Math.floor(index / responseForms.length) % difficulties.length];
    return {
      itemId: `fixture-ca-item-${String(index + 1).padStart(3, "0")}`,
      sourceCommit: "a".repeat(40),
      sourceIds: [`fixture-source-${index + 1}`],
      region: "CALIFORNIA",
      curriculumProfile: "US_CA_MATH",
      grade: "2",
      canonicalTopic: "addition",
      responseForm,
      difficulty,
      sourceModuleHash: H(`source-module-${index}`),
      prompt: localized(`What is ${index + 1} + 1?`),
      ...(responseForm === "multiple-choice" ? { options: [localized(String(index + 1)), localized(String(index + 2)), localized(String(index + 3))] } : {}),
      answer: String(index + 2),
      storedAnswer: String(index + 2),
      acceptedAnswers: [String(index + 2)],
      explanation: localized(`Add one to ${index + 1}.`),
      localePolicy: "FULL_RUNTIME_LOCALIZED_BUNDLE",
      topic: localized("Addition"),
      rubric: "MAIS_NATURAL_CA60_QA_RUBRIC_V4",
      lineageKind: "CCSS",
      batchId: `fixture-batch-${Math.floor(index / 10)}`,
      clusterId: `fixture-source-cluster-${index + 1}`,
      homologyClusterId: `fixture-homology-${index + 1}`,
      topicId: "fixture-addition",
      sourceLessonSlug: `fixture-lesson-${index + 1}`,
    };
  });
}

export function buildSyntheticSampleManifestV5R4(itemLeaves = buildSyntheticNaturalLeavesV5R4()) {
  const selectedRows = itemLeaves.map((leaf, index) => ({
    itemId: leaf.itemId,
    itemHash: calculateFrozenNaturalItemLeafHashV4(leaf),
    clusterId: leaf.homologyClusterId,
    stratum: `${leaf.responseForm}::${leaf.difficulty}`,
    primaryAnalysisWeight: 1,
    secondaryAnalysisWeight: 1 + (index % 5) / 10,
    inclusionProbability: 0.5,
  }));
  const draft = {
    schemaVersion: "SampleManifestV2",
    designId: "MAIS-NATURAL-CA60-V5",
    registrationHash: DESIGN.registrationHash,
    frameRegistrationHash: H("fixture-frame-registration"),
    manifestFrozenAt: "2026-08-26T00:00:00.000Z",
    sampleVersion: 1,
    supersedesSampleManifestHash: null,
    supersededSampleManifest: null,
    algorithmVersion: SAMPLE_ALGORITHM_VERSION,
    manifestTupleRootHash: calculateManifestTupleRootV3(selectedRows),
    registeredPreResultExclusions: [],
    replacementHistory: [],
    selectedRows,
  };
  const materialized = materializeSamplePseudonymFieldsV4(draft);
  return Object.freeze({ ...materialized, sampleManifestHash: calculateArtifactHash(materialized, "sampleManifestHash") });
}

export function buildRunnerFixtureV5R4() {
  const itemLeaves = buildSyntheticNaturalLeavesV5R4();
  const sampleManifest = buildSyntheticSampleManifestV5R4(itemLeaves);
  const provisionalItems = sampleManifest.selectedRows.map((row, index) => ({
    manifestOrdinal: index + 1,
    itemHash: row.itemHash,
    itemIdPseudonym: row.itemIdPseudonym,
    clusterId: row.clusterId,
    stratum: row.stratum,
    primaryAnalysisWeight: row.primaryAnalysisWeight,
    secondaryAnalysisWeight: row.secondaryAnalysisWeight,
    inclusionProbability: row.inclusionProbability,
    privacyScreenEvidenceHash: H(`privacy-${index}`),
    rightsScreenEvidenceHash: H(`rights-${index}`),
    egressEligible: true,
    registeredRandomAudit: index < 12,
  }));
  const roots = itemRoots(provisionalItems);
  const productionSourceManifest = [{ path: "fixture/runner.mjs", byteLength: 10, sha256: H("fixture-production-source") }];
  const testSourceManifest = [{ path: "fixture/runner.test.mjs", byteLength: 10, sha256: H("fixture-test-source") }];
  const registration = sealV5R3Artifact({
    schemaVersion: "NaturalCaExecutionRunnerRegistrationV3",
    runnerVersion: "V5-R4",
    designId: "MAIS-NATURAL-CA60-V5",
    registeredAt: "2026-08-26T00:10:00.000Z",
    supersedesRunnerRegistrationHash: V5_R3_REGISTRATION.selfHash,
    discrepancyReviewHash: V5_R3_A11_REVIEW_HASH,
    discrepancyReviewCommit: V5_R3_A11_REVIEW_COMMIT,
    previousReceiptHash: V5_R3_A11_REVIEW_HASH,
    designRegistrationHash: DESIGN.registrationHash,
    frameRegistrationHash: sampleManifest.frameRegistrationHash,
    samplingFrameHash: H("fixture-sampling-frame"),
    sampleManifestHash: sampleManifest.sampleManifestHash,
    samplePayloadSetHash: roots.samplePayloadSetHash,
    sampleSelectionContentRootHash: H("fixture-sample-selection-root"),
    c0RandomAuditHash: H("fixture-c0-audit"),
    ownerDecisionRequestHash: "2d0e8c24f270aa39292fea1ef8d1d11c4e9bd5d9ecd1bdf5a5bbf5119b964f78",
    ownerDecisionReceiptHash: "855af9696548359bc7364a987aa0dc3a3f9cd5883f87911edd8067bc78ac3ad0",
    privacyScreenHash: roots.privacyScreenHash,
    rightsScreenHash: roots.rightsScreenHash,
    rightsPolicyHash: "c7f2832a701d813e928f1fa34f1b74d1d26a62c96f5bdea8be58d8bff134fe66",
    lineageRuleHash: "8130bcd70f3e42332478a284b5a5b54e0c73b9f3696b1c1c06f25254ea0fe449",
    taxonomyHash: DESIGN.frozenContractHashes.taxonomy,
    labelingAndAdjudicationHash: DESIGN.frozenContractHashes.labeling,
    thresholdsDecisionAndPowerHash: DESIGN.frozenContractHashes.analysis,
    decisionCeiling: "INCONCLUSIVE_MACHINE_REFERENCE",
    providerContractErratumHash: V5_R3_REGISTRATION.providerContractErratumHash,
    runnerSourceCommit: "b".repeat(40),
    productionSourceManifest,
    productionSourceRootHash: sourceRoot(productionSourceManifest),
    testSourceManifest,
    testSourceRootHash: sourceRoot(testSourceManifest),
    methodKernel: {
      inheritedStatisticalMethodHash: DESIGN.analysis.frozenMethodComponentRoots.metricDecisionMethodHash,
      bootstrapGoldenVectorHash: H("fixture-bootstrap-vectors"),
      missingDataMethodHash: H("fixture-missing-data"),
      c0TriggerEngineHash: H("fixture-c0-trigger"),
      providerRequestConstructionHash: H("fixture-provider-request"),
      protectedStorageHash: H("fixture-protected-storage"),
    },
    providerImplementations: {
      openAI: {
        provider: "OPENAI_DIRECT", model: "gpt-5.6-luna", endpoint: "https://us.api.openai.com/v1/responses", projectResidency: "US_STORAGE_PROCESSING",
        adapterHash: H("fixture-openai-adapter"), requestConstructionHash: H("fixture-request"), authorizationGuardHash: H("fixture-auth"),
        transportHash: H("fixture-transport"), atomicLedgerHash: H("fixture-ledger"), routeEvidenceValidatorHash: H("fixture-route"),
        resumeAndCanaryHash: H("fixture-resume"), runnerHash: H("fixture-runner"), scorerHash: H("fixture-scorer"), providerCallsMade: 0,
      },
      deepSeek: {
        provider: "DEEPSEEK_DIRECT", model: "deepseek-v4-pro", endpoint: "https://api.deepseek.com/chat/completions", projectResidency: "UNKNOWN_PENDING_ROUTE_PROBE_EVIDENCE",
        adapterHash: H("fixture-deepseek-adapter"), requestConstructionHash: H("fixture-request"), authorizationGuardHash: H("fixture-auth"),
        transportHash: H("fixture-transport"), atomicLedgerHash: H("fixture-ledger"), routeEvidenceValidatorHash: H("fixture-route"),
        resumeAndCanaryHash: H("fixture-resume"), runnerHash: H("fixture-runner"), scorerHash: H("fixture-scorer"), providerCallsMade: 0,
      },
    },
    authorizationState: {
      credentialReadAuthorized: false, providerExecutionAuthorized: false, naturalQuestionEgressAuthorized: false,
      tokenAuthorizationCreated: false, attemptAuthorizationCreated: false, usdAuthorizationCreated: false,
      credentialReadCount: 0, providerEventCount: 0, naturalQuestionEgressCount: 0, tokenCount: 0,
      attemptCount: 0, usdSpent: 0, referenceLabelCount: 0, naturalQuestionResultCount: 0,
    },
    status: "OFFLINE_IMPLEMENTED_PENDING_FRESH_A11_V5_R4_REVIEW_PROVIDER_EXECUTION_BLOCKED",
    claimCeiling: "FRAME_AND_SAMPLE_FROZEN_RUNNER_OFFLINE_IMPLEMENTED_NOT_EXECUTED",
  });
  const inventory = sealV5R3Artifact({
    schemaVersion: "SampleExecutionInventoryV2", designId: "MAIS-NATURAL-CA60-V5", runnerRegistrationHash: registration.selfHash,
    sampleManifestHash: registration.sampleManifestHash, sampleSelectionContentRootHash: registration.sampleSelectionContentRootHash,
    samplePayloadSetHash: registration.samplePayloadSetHash, privacyScreenHash: registration.privacyScreenHash,
    rightsScreenHash: registration.rightsScreenHash, c0RandomAuditHash: registration.c0RandomAuditHash,
    canaryItemHash: provisionalItems[0].itemHash, itemCount: 60, items: provisionalItems,
  });
  const review = sealV5R3Artifact({
    schemaVersion: "IndependentExecutionRunnerReviewReceiptV2", designId: "MAIS-NATURAL-CA60-V5", runnerVersion: "V5-R4",
    reviewedAt: "2026-08-26T00:20:00.000Z", decision: "CONCURRED", reviewerLane: "A11", findingCount: 0,
    reviewedRunnerRegistrationHash: registration.selfHash, reviewedRunnerSourceCommit: registration.runnerSourceCommit,
    reviewedProductionSourceRootHash: registration.productionSourceRootHash, reviewedTestSourceRootHash: registration.testSourceRootHash,
  });
  return Object.freeze({ registration, inventory, review, sampleManifest, itemLeaves });
}

function providerTuple(provider) {
  return provider === "OPENAI_DIRECT"
    ? { provider, model: "gpt-5.6-luna", endpoint: "https://us.api.openai.com/v1/responses", projectResidency: "US_STORAGE_PROCESSING", dataRegion: "US",
      roleSet: [...V5_R4_AUTHORIZATION_CONSTANTS.openAIRoles], maximumAttempts: 610, maximumSuccessfulCalls: 300, maximumTokens: 4_000_000,
      roleContractRootHash: DESIGN.providerControls.openaiReferenceRoleContractCatalog.roleContractRootHash, adapterTransformHash: OPENAI_REFERENCE_ADAPTER_TRANSFORM_HASH_V5 }
    : { provider, model: "deepseek-v4-pro", endpoint: "https://api.deepseek.com/chat/completions", projectResidency: "UNKNOWN_PENDING_ROUTE_PROBE_EVIDENCE", dataRegion: "UNKNOWN_PENDING_ROUTE_PROBE_EVIDENCE",
      roleSet: [...V5_R4_AUTHORIZATION_CONSTANTS.deepSeekRoles], maximumAttempts: 850, maximumSuccessfulCalls: 420, maximumTokens: 6_000_000,
      roleContractRootHash: DESIGN.providerControls.deepSeekRoleContractCatalog.inheritedRoleContractRootHash, adapterTransformHash: DEEPSEEK_EVALUATION_ADAPTER_V5_R2_CONSTANTS.adapterTransformHash };
}

export function buildAuthorizationFixtureV5R4(core, provider = "OPENAI_DIRECT", { referenceSealHash = null, referenceAttemptChainHash = null } = {}) {
  const tuple = providerTuple(provider);
  const credential = sealV5R3Artifact({ schemaVersion: "CredentialReadinessReceiptV2", runnerRegistrationHash: core.registration.selfHash,
    provider, targetEnvironment: "FIXTURE_ONLY", variableName: provider === "OPENAI_DIRECT" ? "OPENAI_API_KEY" : "DEEPSEEK_API_KEY",
    status: "READY_REDACTED_NO_VALUE_RECORDED", credentialValueRecorded: false, checkedAt: "2026-08-26T00:25:00.000Z" });
  const routeAuthorization = sealV5R3Artifact({
    schemaVersion: "RouteProbeAuthorizationV1", designId: "MAIS-NATURAL-CA60-V5", runnerRegistrationHash: core.registration.selfHash,
    ...Object.fromEntries(["provider", "model", "endpoint", "projectResidency"].map((field) => [field, tuple[field]])),
    issuedAt: "2026-08-26T00:30:00.000Z", expiresAt: "2026-08-28T00:00:00.000Z", authorizedBy: "FIXTURE_OWNER",
    ownerGrantHash: H("route-owner-grant"), credentialReadinessReceiptHash: credential.selfHash, containsNaturalQuestionText: false,
    credentialReadAuthorized: true, providerExecutionAuthorized: true, tokenAuthorizationCreated: true,
    attemptAuthorizationCreated: true, usdAuthorizationCreated: true, maximumAttempts: 1, maximumTokens: 1000,
    maximumEstimatedUsd: 1, currency: "USD",
  });
  const routeAttempt = sealV5R3Artifact({
    schemaVersion: "ProviderRouteProbeAttemptReceiptV1", authorizationHash: routeAuthorization.selfHash, provider,
    requestedModel: tuple.model, observedModel: tuple.model, requestedEndpoint: tuple.endpoint, observedEndpoint: tuple.endpoint,
    projectResidency: tuple.projectResidency, requestBodyClass: "ROUTE_PROBE_NO_NATURAL_CONTENT_V1",
    requestBodyHash: routeProbeWireHashV5R4(provider), responseBodyHash: H("route-response"), providerRequestId: "fixture-route-request",
    containsNaturalQuestionText: false, startedAt: "2026-08-26T00:31:00.000Z", finishedAt: "2026-08-26T00:31:01.000Z",
    latencyMs: 1000, httpStatus: 200, attemptStatus: "SUCCEEDED", inputTokens: 5, outputTokens: 2, totalTokens: 7, estimatedCostUsd: 0.0001,
  });
  const subjectIdentity = `${provider}-fixture-project`;
  const identityHash = H(subjectIdentity);
  const leaf = (evidenceKind, sourceKind, sourceAttemptReceiptHash) => sealV5R3Artifact({
    schemaVersion: "ProviderRouteEvidenceLeafV1", evidenceKind, provider, model: tuple.model, endpoint: tuple.endpoint,
    projectResidency: tuple.projectResidency, subjectIdentityHash: identityHash, sourceKind,
    sourceLocatorHash: H(`${evidenceKind}-locator`), sourceBytesHash: H(`${evidenceKind}-bytes`), sourceAttemptReceiptHash,
    capturedAt: "2026-08-26T00:32:00.000Z", expiresAt: "2026-08-28T00:00:00.000Z", status: "CONFIRMED",
  });
  const priceSnapshot = sealV5R3Artifact({
    schemaVersion: "ProviderPriceSnapshotV2", provider, model: tuple.model, endpoint: tuple.endpoint, dataRegion: tuple.dataRegion,
    currency: "USD", inputUsdPerMillionTokens: 1, outputUsdPerMillionTokens: 2, sourceKind: "PROVIDER_OFFICIAL_RATE_CARD",
    sourceLocatorHash: H("price-locator"), sourceBytesHash: H("price-bytes"), capturedAt: "2026-08-26T00:32:00.000Z", expiresAt: "2026-08-28T00:00:00.000Z",
  });
  const routeEvidence = buildRouteEvidenceBundleV1({ registration: core.registration, routeProbeAuthorization: routeAuthorization,
    routeProbeAttemptReceipt: routeAttempt, accountEvidence: leaf("ACCOUNT_PROJECT_IDENTITY", "PROVIDER_CONSOLE_EXPORT", null),
    billingEvidence: leaf("DIRECT_BILLING_ROUTE", "PROVIDER_BILLING_EXPORT", null),
    dataRegionEvidence: leaf("DATA_REGION", "PROVIDER_RESPONSE", routeAttempt.selfHash), priceSnapshot, validatedAt: "2026-08-26T00:33:00.000Z" });
  const implementation = provider === "OPENAI_DIRECT" ? core.registration.providerImplementations.openAI : core.registration.providerImplementations.deepSeek;
  const commonGrant = {
    designId: "MAIS-NATURAL-CA60-V5", runnerRegistrationHash: core.registration.selfHash, freshRunnerReviewHash: core.review.selfHash,
    sampleExecutionInventoryHash: core.inventory.selfHash, referenceSealHash, referenceAttemptChainHash,
    roleContractRootHash: tuple.roleContractRootHash, adapterTransformHash: tuple.adapterTransformHash, providerImplementationHash: implementation.adapterHash,
    provider, model: tuple.model, endpoint: tuple.endpoint, projectResidency: tuple.projectResidency,
    routeEvidenceBundleHash: routeEvidence.selfHash, priceSnapshotHash: priceSnapshot.selfHash, egressPolicyHash: providerEgressPolicyV5R4(provider).policyHash,
    issuedAt: "2026-08-26T00:40:00.000Z", expiresAt: "2026-08-28T00:00:00.000Z", authorizedBy: "FIXTURE_OWNER",
    maximumAttempts: tuple.maximumAttempts, maximumSuccessfulCalls: tuple.maximumSuccessfulCalls,
    maximumInputTokens: Math.floor(tuple.maximumTokens / 2), maximumOutputTokens: Math.ceil(tuple.maximumTokens / 2), maximumTokens: tuple.maximumTokens,
    maximumEstimatedUsd: 25, concurrencyCap: 4, maximumAttemptsPerItemRole: 2,
    worstCaseCostPreviewUsd: 10, bufferedWorstCaseUsd: 12, currency: "USD", nonAuthorizations: [...NON_AUTHORIZATIONS],
    credentialReadAuthorized: true, providerExecutionAuthorized: true, naturalQuestionEgressAuthorized: true,
    tokenAuthorizationCreated: true, attemptAuthorizationCreated: true, usdAuthorizationCreated: true,
  };
  const ownerGrant = sealV5R3Artifact({ schemaVersion: "OwnerProviderGrantV2", ...commonGrant });
  const authorization = sealV5R3Artifact({
    schemaVersion: "ProviderAuthorizationV4", authorizationKind: provider === "OPENAI_DIRECT" ? "OPENAI_REFERENCE_LABELING" : "DEEPSEEK_EVALUATION",
    ...commonGrant,
    runnerSourceCommit: core.registration.runnerSourceCommit, productionSourceRootHash: core.registration.productionSourceRootHash,
    testSourceRootHash: core.registration.testSourceRootHash, frameRegistrationHash: core.registration.frameRegistrationHash,
    sampleManifestHash: core.registration.sampleManifestHash, samplePayloadSetHash: core.registration.samplePayloadSetHash,
    privacyScreenHash: core.registration.privacyScreenHash, rightsScreenHash: core.registration.rightsScreenHash,
    projectIdentityHash: identityHash, roleSet: tuple.roleSet, ownerGrantHash: ownerGrant.selfHash,
    credentialReadinessReceiptHash: credential.selfHash,
  });
  return Object.freeze({ ...core, routeAuthorization, routeAttempt, routeEvidence, priceSnapshot, credentialReadinessReceipt: credential,
    ownerGrant, authorization, subjectIdentity, at: "2026-08-26T01:00:00.000Z", frozenRouteProbeRequest: frozenRouteProbeWireRequestV5R4(provider) });
}

export function credentialBundleFixtureV5R4(fixture, apiKey = "fixture-only") {
  const base = { apiKey, subjectIdentity: fixture.subjectIdentity };
  return fixture.authorization.provider === "OPENAI_DIRECT"
    ? Object.freeze({ ...base, openAIProjectId: fixture.subjectIdentity })
    : Object.freeze(base);
}

export function openAIResponseEnvelopeV5R4(payload = { solution: "2", solvability: "SOLVABLE", uncertain: false }) {
  return {
    id: "resp_fixture_v5_r4", object: "response", status: "completed", model: "gpt-5.6-luna",
    reasoning: { effort: "high", context: "current_turn" },
    output: [{ id: "reasoning_fixture", type: "reasoning", summary: [] }, { id: "message_fixture", type: "message", status: "completed", role: "assistant",
      content: [{ type: "output_text", text: JSON.stringify(payload), annotations: [] }] }],
    usage: { input_tokens: 120, output_tokens: 40, output_tokens_details: { reasoning_tokens: 10 }, total_tokens: 160 },
  };
}

export function deepSeekResponseEnvelopeV5R4(payload = {
  valid: true,
  surfaceDisposition: "NO_FINDING",
  findings: [],
  requiredRevisionCodes: [],
}) {
  return {
    id: "ds_response_fixture_v5_r4",
    model: "deepseek-v4-pro",
    choices: [{ index: 0, message: { role: "assistant", content: JSON.stringify(payload) }, finish_reason: "stop" }],
    usage: { prompt_tokens: 120, completion_tokens: 40, completion_tokens_details: { reasoning_tokens: 10 }, total_tokens: 160 },
  };
}
