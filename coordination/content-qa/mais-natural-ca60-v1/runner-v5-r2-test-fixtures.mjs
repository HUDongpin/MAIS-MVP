import DESIGN_REGISTRATION from "../../research/mais-natural-ca60-v1/versions/design-v5/design-registration.json" with { type: "json" };
import V5_PACKAGE_MANIFEST from "../../research/mais-natural-ca60-v1/versions/design-v5/package-manifest.json" with { type: "json" };
import { jcsHash } from "../../research/mais-natural-ca60-v1/versions/design-v5/design-contract.mjs";
import {
  buildOpenAIReferenceLogicalRequestV5,
  buildOpenAIReferenceWireRequestV5,
} from "./openai-reference-adapter-v5.mjs";

export const hash = (character) => character.repeat(64);

export function openAISolveInput() {
  return {
    prompt: "What is 2 + 3?",
    options: ["4", "5", "6"],
    locale: "en-US",
    grade: "2",
    topic: "addition",
    responseForm: "multiple-choice",
  };
}
export function openAIRequestFixture() {
  const logicalRequest = buildOpenAIReferenceLogicalRequestV5({ role: "A_SOLVE", providerInput: openAISolveInput() });
  return {
    itemIdPseudonym: "item-pseudo-001",
    itemHash: hash("f"),
    clusterId: "cluster-001",
    provider: "OPENAI_DIRECT",
    model: "gpt-5.6-luna",
    endpoint: "https://us.api.openai.com/v1/responses",
    projectResidency: "US_STORAGE_PROCESSING",
    apiSurface: "RESPONSES_API_V1",
    role: "A_SOLVE",
    logicalRequest,
    wireRequest: buildOpenAIReferenceWireRequestV5(logicalRequest),
    reserveInputTokens: 8_000,
    reserveOutputTokens: 8_192,
    reserveTokens: 16_192,
    reserveUsd: 0.25,
  };
}

export function activePointerFixture() {
  return {
    schemaVersion: "NaturalCaActiveDesignPointerV1",
    artifactKind: "ACTIVE_DESIGN_POINTER_NOT_A_REGISTRATION",
    designFamily: "MAIS-NATURAL-CA60",
    activeDesignId: "MAIS-NATURAL-CA60-V5",
    activeDesignPath: "versions/design-v5/design-registration.json",
    activeRegistrationHash: DESIGN_REGISTRATION.registrationHash,
    predecessorDesignId: "MAIS-NATURAL-CA60-V3",
    predecessorRegistrationHash: hash("0"),
    pointerUpdatedAt: "2026-08-26T01:00:00.000Z",
    reason: "post-freeze live-runner test fixture",
    firstProviderExecutionAllowed: false,
  };
}

export function runnerReviewFixture() {
  const body = {
    schemaVersion: "IndependentDesignReviewReceiptV1",
    designId: "MAIS-NATURAL-CA60-V5",
    designRegistrationHash: DESIGN_REGISTRATION.registrationHash,
    reviewedDesignPackageRootHash: V5_PACKAGE_MANIFEST.packageRootHash,
    runnerCommit: "5".repeat(40),
    runnerHash: hash("6"),
    adapterHash: hash("7"),
    reviewerLane: "A11",
    decision: "CONCURRED",
    reviewedAt: "2026-08-26T00:50:00.000Z",
  };
  return { ...body, reviewHash: jcsHash(body) };
}

const OPENAI_ALLOWLIST = [
  "prompt", "options", "locale", "grade", "topic", "responseForm",
  "storedAnswer", "acceptedAnswers", "explanation", "itemSolveArtifact",
  "aSolveArtifact", "aLabelArtifact", "bSolveArtifact", "bLabelArtifact",
];

const EGRESS_DENYLIST = [
  "OPENAI_REFERENCE_FINAL_REFERENCE_TO_DEEPSEEK",
  "DEEPSEEK_OUTPUT_TO_OPENAI_REFERENCE",
  "SOURCE_PATH",
  "GIT_METADATA",
  "CREDENTIAL",
  "STUDENT_OR_USER_DATA",
  "OTHER_ITEM",
  "UNAUTHORIZED_COPYRIGHT_CONTENT",
  "INTERNAL_RESEARCH_RECORD",
];

export function openAIAuthorizationFixture(request, overrides = {}) {
  const body = {
    schemaVersion: "ProviderAuthorizationV2",
    authorizationId: "auth-openai-fixture-r2-001",
    authorizationKind: "OPENAI_REFERENCE_LABELING",
    designId: "MAIS-NATURAL-CA60-V5",
    registrationHash: DESIGN_REGISTRATION.registrationHash,
    frameRegistrationHash: hash("1"),
    samplingFrameHash: hash("2"),
    sampleManifestHash: hash("3"),
    runtimeConfigHash: hash("4"),
    promptSetHash: DESIGN_REGISTRATION.providerControls.openaiReferenceRoleContractCatalog.roleContractRootHash,
    schemaSetHash: DESIGN_REGISTRATION.interfaces.schemaSetHash,
    runnerCommit: "5".repeat(40),
    runnerHash: hash("6"),
    adapterHash: hash("7"),
    providerRouteDecisionHash: hash("8"),
    projectRoutePreflightReceiptHash: hash("9"),
    provider: "OPENAI_DIRECT",
    projectResidency: "US_STORAGE_PROCESSING",
    dataRegion: "US",
    apiSurface: "RESPONSES_API_V1",
    endpoint: "https://us.api.openai.com/v1/responses",
    model: "gpt-5.6-luna",
    roleSet: ["A_SOLVE", "A_LABEL", "B_SOLVE", "B_LABEL", "ADJUDICATOR"],
    logicalRequestTemplateHash: DESIGN_REGISTRATION.providerControls.openaiReferenceEnvelope.logicalRequestTemplateHash,
    wireRequestTemplateHash: DESIGN_REGISTRATION.providerControls.openaiReferenceEnvelope.wireRequestTemplateHash,
    payloadSetHash: jcsHash([request.itemHash]),
    allowedOrigin: "https://us.api.openai.com",
    egressAllowlist: OPENAI_ALLOWLIST,
    egressDenylist: EGRESS_DENYLIST,
    privacyScreenHash: hash("a"),
    rightsScreenHash: hash("b"),
    issuedAt: "2026-08-26T01:10:00.000Z",
    expiresAt: "2026-08-26T02:10:00.000Z",
    maximumAttempts: 610,
    maximumSuccessfulCalls: 300,
    maximumInputTokens: 2_000_000,
    maximumOutputTokens: 2_000_000,
    maximumTokens: 4_000_000,
    maximumEstimatedUsd: 25,
    currency: "USD",
    concurrencyCap: 4,
    worstCaseCostPreviewUsd: 20,
    costBufferMultiplier: 1.2,
    bufferedWorstCaseUsd: 24,
    priceSnapshotHash: hash("c"),
    authorizedBy: "owner-pseudonym",
    ownerGrantHash: hash("d"),
    authorizationEvidenceHash: hash("e"),
    nonAuthorizations: [
      "NO_DEPLOYMENT",
      "NO_LIVE_QUESTION_BANK_MUTATION",
      "NO_GIT_MUTATION",
      "NO_MODEL_FALLBACK",
      "NO_BUDGET_TRANSFER",
      "NO_PROMPT_TUNING",
      "NO_RESULT_DEPENDENT_REPLACEMENT",
    ],
    previousAuthorizationHash: null,
    isCurrentAuthorization: true,
    referenceSealHash: null,
    referenceAttemptChainHash: null,
    routeProbeAuthorizationHash: null,
    routeProbeReceiptHash: null,
    ...overrides,
  };
  return { ...body, authorizationHash: jcsHash(body) };
}

export function trustedOpenAIFixture(authorization, request, overrides = {}) {
  return {
    at: "2026-08-26T01:30:00.000Z",
    authorizationHash: authorization.authorizationHash,
    ownerGrantHash: authorization.ownerGrantHash,
    authorizationEvidenceHash: authorization.authorizationEvidenceHash,
    priceSnapshotHash: authorization.priceSnapshotHash,
    priceSnapshotCurrent: true,
    projectRoutePreflightReceiptHash: authorization.projectRoutePreflightReceiptHash,
    providerRouteDecisionHash: authorization.providerRouteDecisionHash,
    frameRegistrationHash: authorization.frameRegistrationHash,
    samplingFrameHash: authorization.samplingFrameHash,
    sampleManifestHash: authorization.sampleManifestHash,
    runtimeConfigHash: authorization.runtimeConfigHash,
    promptSetHash: authorization.promptSetHash,
    schemaSetHash: authorization.schemaSetHash,
    runnerCommit: authorization.runnerCommit,
    runnerHash: authorization.runnerHash,
    adapterHash: authorization.adapterHash,
    privacyScreenHash: authorization.privacyScreenHash,
    rightsScreenHash: authorization.rightsScreenHash,
    authorizedItemHashes: [request.itemHash],
    ...overrides,
  };
}

export function budgetFixture(overrides = {}) {
  return {
    attemptsUsed: 0,
    successfulCallsUsed: 0,
    inputTokensUsed: 0,
    outputTokensUsed: 0,
    totalTokensUsed: 0,
    estimatedUsdUsed: 0,
    pendingReservedInputTokens: 0,
    pendingReservedOutputTokens: 0,
    pendingReservedTokens: 0,
    pendingReservedUsd: 0,
    concurrencyActive: 0,
    roleAttemptsUsed: 0,
    ...overrides,
  };
}

export function validOpenAIReferenceContext(transport) {
  const request = openAIRequestFixture();
  const authorization = openAIAuthorizationFixture(request);
  return {
    designRegistration: DESIGN_REGISTRATION,
    activeDesignPointer: activePointerFixture(),
    independentReviewReceipt: runnerReviewFixture(),
    authorization,
    trustedAuthorization: trustedOpenAIFixture(authorization, request),
    request,
    budgetState: budgetFixture(),
    transport,
  };
}
