import assert from "node:assert/strict";
import test from "node:test";

import RESULT_REVIEW_SCHEMA from "./schemas/IndependentExecutionResultReviewReceiptV1.schema.json" with { type: "json" };
import { calculateArtifactHash } from "../../research/mais-natural-ca60-v1/versions/design-v2/design-contract.mjs";
import { calculateSampleSelectionContentRootV3 } from "./sample-contract-v5.mjs";
import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  buildAuthorizationFixtureV5R4,
  buildRunnerFixtureV5R4,
} from "./runner-v5-r4-test-fixtures.mjs";
import {
  validateClosedSchemaAgainstV5R5,
} from "./schema-contract-v5-r5.mjs";
import {
  validateManifestBoundInventoryV5R5,
} from "./execution-evidence-v5-r5.mjs";
import {
  buildAuthenticatedRouteEvidenceV5R5,
  buildProviderCostPreviewV5R5,
  validateAuthenticatedRouteEvidenceV5R5,
} from "./route-authorization-v5-r5.mjs";
import {
  computeReferenceAgreementV5R5,
} from "./reference-agreement-v5-r5.mjs";
import {
  buildDeepSeekPlanReceiptKernelV5R5,
  validateStateBoundDispatchV5R5,
} from "./state-bound-dispatch-v5-r5.mjs";
import {
  buildProviderRequestArtifactV5R4,
} from "./provider-request-v5-r4.mjs";
import {
  createStateBoundExactProviderTransportV5R5,
  runGuardedProviderAttemptV5R5,
} from "./guarded-provider-attempt-v5-r5.mjs";
import {
  deriveExecutionIntegrityEvidenceV5R5,
} from "./scorer-v5-r5.mjs";
import {
  buildInterruptedAttemptRecoveryReceiptV5R5,
} from "./recovery-v5-r5.mjs";
import {
  buildWorkflowIndexSupersessionV5R5,
} from "./workflow-index-v5-r5.mjs";

const H = (value) => sha256V5R3(String(value));

function selfHashedReview(decision, discrepancyCodes) {
  return sealV5R3Artifact({
    schemaVersion: "IndependentExecutionResultReviewReceiptV1",
    designId: "MAIS-NATURAL-CA60-V5",
    runnerRegistrationHash: H("runner"),
    finalVerificationReceiptHash: H("verification"),
    aggregateScoreReceiptHash: H("score"),
    reviewerLane: "A11",
    independentImplementation: true,
    decision,
    discrepancyCodes,
    reviewedAt: "2026-08-26T06:00:00.000Z",
  });
}

function evidenceSource({ evidenceKind, claims, sourceKind = "PROVIDER_CONSOLE_EXPORT" }) {
  const sourceBytes = JSON.stringify({ evidenceKind, ...claims });
  return {
    sourceKind,
    evidenceKind,
    mediaType: "application/json",
    sourceLocator: `fixture://${evidenceKind.toLowerCase()}`,
    sourceBytes,
    capturedAt: "2026-08-26T00:32:00.000Z",
    expiresAt: "2026-08-28T00:00:00.000Z",
  };
}

test("R5 validator enforces conditional array cardinality even when then omits type=array", () => {
  assert.notDeepEqual(validateClosedSchemaAgainstV5R5(selfHashedReview("CONCURRED", ["FORBIDDEN"]), RESULT_REVIEW_SCHEMA), []);
  assert.notDeepEqual(validateClosedSchemaAgainstV5R5(selfHashedReview("DISCREPANCY", []), RESULT_REVIEW_SCHEMA), []);
  assert.deepEqual(validateClosedSchemaAgainstV5R5(selfHashedReview("CONCURRED", []), RESULT_REVIEW_SCHEMA), []);
  assert.deepEqual(validateClosedSchemaAgainstV5R5(selfHashedReview("DISCREPANCY", ["FIXTURE_DISCREPANCY"]), RESULT_REVIEW_SCHEMA), []);
});

test("R5 inventory validator rebuilds every ordered manifest, audit, and screen field", () => {
  const core = buildRunnerFixtureV5R4();
  const sampleManifest = {
    ...structuredClone(core.sampleManifest),
    frameSelectionContentRootHash: H("fixture-frame-selection"),
    clusterAuditSelectionContentHash: H("fixture-cluster-audit-selection"),
    algorithmHash: H("fixture-sample-algorithm"),
    selectionFormula: "FIXTURE_FROZEN_SELECTION_FORMULA",
    allocationMethod: "FIXTURE_HAMILTON",
    stratumAllocations: [],
    hamiltonAudit: {},
    secondaryEstimand: {},
    representativeSelectionRule: "FIXTURE_LOWEST_DIGEST",
    secondaryWeightSummary: {},
  };
  delete sampleManifest.sampleManifestHash;
  sampleManifest.sampleSelectionContentRootHash = calculateSampleSelectionContentRootV3(sampleManifest);
  sampleManifest.sampleManifestHash = calculateArtifactHash(sampleManifest, "sampleManifestHash");
  const screenEvidence = core.inventory.items.map((item) => ({
    itemHash: item.itemHash,
    privacyScreenEvidenceHash: item.privacyScreenEvidenceHash,
    rightsScreenEvidenceHash: item.rightsScreenEvidenceHash,
    egressEligible: true,
  }));
  const c0RandomAudit = {
    schemaVersion: "C0RandomAuditManifestV3",
    sampleManifestHash: sampleManifest.sampleManifestHash,
    sampleSelectionContentRootHash: sampleManifest.sampleSelectionContentRootHash,
    selectedRows: core.inventory.items.filter(({ registeredRandomAudit }) => registeredRandomAudit).map(({ itemHash }) => ({ itemHash })),
  };
  c0RandomAudit.auditHash = calculateArtifactHash(c0RandomAudit, "auditHash");
  const registration = sealV5R3Artifact({
    ...Object.fromEntries(Object.entries(core.registration).filter(([key]) => key !== "selfHash")),
    sampleManifestHash: sampleManifest.sampleManifestHash,
    sampleSelectionContentRootHash: sampleManifest.sampleSelectionContentRootHash,
    c0RandomAuditHash: c0RandomAudit.auditHash,
  });
  const inventory = sealV5R3Artifact({
    ...Object.fromEntries(Object.entries(core.inventory).filter(([key]) => key !== "selfHash")),
    runnerRegistrationHash: registration.selfHash,
    sampleManifestHash: sampleManifest.sampleManifestHash,
    sampleSelectionContentRootHash: sampleManifest.sampleSelectionContentRootHash,
    c0RandomAuditHash: c0RandomAudit.auditHash,
  });
  const context = { registration, inventory, sampleManifest, c0RandomAudit, screenEvidence };
  assert.deepEqual(validateManifestBoundInventoryV5R5(context), []);
  const movedAudit = structuredClone(inventory);
  movedAudit.items[0].registeredRandomAudit = false;
  movedAudit.items[20].registeredRandomAudit = true;
  const resealed = sealV5R3Artifact(Object.fromEntries(Object.entries(movedAudit).filter(([key]) => key !== "selfHash")));
  assert.match(validateManifestBoundInventoryV5R5({ ...context, inventory: resealed }).join("; "), /exact reconstruction|random audit/iu);
});

test("R5 route evidence is reconstructed from protected bytes and rejects tampering or unresolved DeepSeek region", () => {
  const core = buildRunnerFixtureV5R4();
  const commonClaims = {
    provider: "OPENAI_DIRECT",
    model: "gpt-5.6-luna",
    endpoint: "https://us.api.openai.com/v1/responses",
    projectResidency: "US_STORAGE_PROCESSING",
    subjectIdentityHash: H("fixture-openai-project"),
  };
  const receipt = buildAuthenticatedRouteEvidenceV5R5({
    activeRunnerRegistrationHash: H("active-r5"),
    provider: "OPENAI_DIRECT",
    sources: [
      evidenceSource({ evidenceKind: "ACCOUNT_PROJECT_IDENTITY", claims: commonClaims }),
      evidenceSource({ evidenceKind: "DIRECT_BILLING_ROUTE", claims: { ...commonClaims, directBilling: true }, sourceKind: "PROVIDER_BILLING_EXPORT" }),
      evidenceSource({ evidenceKind: "DATA_REGION", claims: { ...commonClaims, dataRegion: "US" }, sourceKind: "PROVIDER_RESPONSE" }),
      evidenceSource({ evidenceKind: "PRICE", claims: { ...commonClaims, currency: "USD", inputUsdPerMillionTokens: 1, outputUsdPerMillionTokens: 2 }, sourceKind: "PROVIDER_OFFICIAL_RATE_CARD" }),
      evidenceSource({ evidenceKind: "ROUTE_PROBE_RESPONSE", claims: { ...commonClaims, httpStatus: 200, attemptStatus: "SUCCEEDED", containsNaturalQuestionText: false }, sourceKind: "PROVIDER_RESPONSE" }),
    ],
    validatedAt: "2026-08-26T00:34:00.000Z",
  });
  assert.deepEqual(validateAuthenticatedRouteEvidenceV5R5({ receipt }), []);
  const tampered = structuredClone(receipt);
  tampered.sources[0].sourceBytes = tampered.sources[0].sourceBytes.replace("OPENAI_DIRECT", "DEEPSEEK_DIRECT");
  const resealed = sealV5R3Artifact(Object.fromEntries(Object.entries(tampered).filter(([key]) => key !== "selfHash")));
  assert.match(validateAuthenticatedRouteEvidenceV5R5({ receipt: resealed }).join("; "), /source bytes|reconstruction|hash/iu);
  assert.throws(() => buildAuthenticatedRouteEvidenceV5R5({
    activeRunnerRegistrationHash: H("active-r5"),
    provider: "DEEPSEEK_DIRECT",
    sources: [evidenceSource({ evidenceKind: "DATA_REGION", claims: { provider: "DEEPSEEK_DIRECT", model: "deepseek-v4-pro", endpoint: "https://api.deepseek.com/chat/completions", projectResidency: "UNKNOWN_PENDING_ROUTE_PROBE_EVIDENCE", dataRegion: "UNKNOWN_PENDING_ROUTE_PROBE_EVIDENCE", subjectIdentityHash: H("deepseek") } })],
    validatedAt: "2026-08-26T00:34:00.000Z",
  }), /resolved|unknown|complete/iu);
  assert.equal(core.registration.authorizationState.providerEventCount, 0);
});

test("R5 cost preview is independently recomputed from caps, full call graph, and positive authenticated rates", () => {
  const preview = buildProviderCostPreviewV5R5({
    activeRunnerRegistrationHash: H("active-r5"),
    provider: "OPENAI_DIRECT",
    maximumSuccessfulCalls: 300,
    maximumAttempts: 610,
    maximumInputTokens: 1_542_400,
    maximumOutputTokens: 2_457_600,
    maximumTokens: 4_000_000,
    maximumEstimatedUsd: 25,
    inputUsdPerMillionTokens: 1,
    outputUsdPerMillionTokens: 2,
    priceEvidenceHash: H("price"),
    computedAt: "2026-08-26T00:35:00.000Z",
  });
  assert.equal(preview.maximumOutputTokens, 300 * 8192);
  assert.equal(preview.worstCaseCostPreviewUsd, 6.4576);
  assert.equal(preview.bufferedWorstCaseUsd, 7.74912);
  assert.throws(() => buildProviderCostPreviewV5R5({ ...preview, selfHash: undefined, inputUsdPerMillionTokens: 0 }), /positive/iu);
});

test("R5 state-bound core blocks DeepSeek without full execution registration/C0 set and blocks unnecessary adjudication", () => {
  const openAI = buildAuthorizationFixtureV5R4(buildRunnerFixtureV5R4());
  const deepSeek = buildAuthorizationFixtureV5R4(buildRunnerFixtureV5R4(), "DEEPSEEK_DIRECT", {
    referenceSealHash: H("reference"),
    referenceAttemptChainHash: H("reference-chain"),
  });
  assert.match(validateStateBoundDispatchV5R5({ ...deepSeek, provider: "DEEPSEEK_DIRECT", role: "B_PRIME_CRITIQUE", ledgerEntries: [] }).join("; "), /execution registration/iu);
  assert.match(validateStateBoundDispatchV5R5({ ...deepSeek, provider: "DEEPSEEK_DIRECT", role: "C0_PRIME_ROLE_1", ledgerEntries: [] }).join("; "), /C0 execution set|execution registration/iu);
  assert.match(validateStateBoundDispatchV5R5({ ...openAI, provider: "OPENAI_DIRECT", role: "ADJUDICATOR", ledgerEntries: [], adjudicationTrigger: { adjudicationRequired: false } }).join("; "), /adjudication.*required|planner/iu);
});

test("R5 DeepSeek planner kernel returns the one exact canary action instead of silently completing", () => {
  const core = buildRunnerFixtureV5R4();
  const plan = buildDeepSeekPlanReceiptKernelV5R5({
    registration: core.registration,
    inventory: core.inventory,
    ledgerEntries: [],
    provider: "DEEPSEEK_DIRECT",
    mode: "DEEPSEEK_CANARY",
    canaryGate: null,
    canaryPredicateReceipt: null,
    c0ExecutionSet: null,
    at: "2026-08-26T00:35:00.000Z",
  });
  assert.equal(plan.planStatus, "NEXT_ACTION");
  assert.equal(plan.itemHash, core.inventory.canaryItemHash);
  assert.equal(plan.manifestOrdinal, 1);
  assert.equal(plan.role, "B_PRIME_CRITIQUE");
  assert.equal(plan.failedAttemptsForItemRole, 0);
  assert.equal(plan.ledgerTerminalHash, null);
  assert.equal(plan.c0DecisionHash, null);
});

test("R5 guarded transport rejects a planner bypass before audit, reservation, credential read, or HTTP", async () => {
  const fixture = buildAuthorizationFixtureV5R4(buildRunnerFixtureV5R4(), "DEEPSEEK_DIRECT", {
    referenceSealHash: H("fabricated-reference"),
    referenceAttemptChainHash: H("fabricated-chain"),
  });
  const requestArtifact = buildProviderRequestArtifactV5R4({
    registration: fixture.registration,
    authorization: fixture.authorization,
    inventory: fixture.inventory,
    sampleManifest: fixture.sampleManifest,
    itemLeaf: fixture.itemLeaves[0],
    role: "B_PRIME_CRITIQUE",
    attemptId: "caller-selected-bypass-attempt",
    ledgerEntries: [],
  });
  let credentialReads = 0;
  let fetchCalls = 0;
  let reservations = 0;
  let auditWrites = 0;
  const transport = createStateBoundExactProviderTransportV5R5({
    credentialReader: async () => { credentialReads += 1; return null; },
    fetchImplementation: async () => { fetchCalls += 1; throw new Error("must not fetch"); },
  });
  const result = await runGuardedProviderAttemptV5R5({
    ...fixture,
    provider: "DEEPSEEK_DIRECT",
    mode: "DEEPSEEK_CANARY",
    role: requestArtifact.role,
    itemHash: requestArtifact.itemHash,
    requestArtifact,
    ledgerEntries: [],
    transport,
    ledger: { reserve: async () => { reservations += 1; }, complete: async () => { throw new Error("must not complete"); } },
    dispatchAuditStore: { append: async () => { auditWrites += 1; } },
  });
  assert.equal(result.status, "AUTHORIZATION_BLOCKED");
  assert.match(result.errors.join("; "), /DeepSeek execution registration|active V5-R5|fresh A11/iu);
  assert.equal(auditWrites, 0);
  assert.equal(reservations, 0);
  assert.equal(credentialReads, 0);
  assert.equal(fetchCalls, 0);
  assert.equal(result.providerEventCount, 0);
  assert.equal(result.httpRequestCount, 0);
});

test("R5 execution integrity derives invalid flags from the exact graph instead of hardcoding green", () => {
  const evidence = deriveExecutionIntegrityEvidenceV5R5({
    activeRunnerRegistrationHash: H("active-r5"),
    expectedCallGraph: [{ itemHash: H("item-1"), role: "B_PRIME_CRITIQUE" }],
    completedCalls: [
      { itemHash: H("item-1"), role: "B_PRIME_CRITIQUE", attemptStatus: "SUCCEEDED", stateBound: true,
        terminalProviderFailure: false, canaryOrOrderViolation: false },
      { itemHash: H("item-2"), role: "C0_PRIME_ROLE_1", attemptStatus: "SUCCEEDED", stateBound: false,
        terminalProviderFailure: false, canaryOrOrderViolation: false },
    ],
    receiptChainErrors: [],
    capErrors: [],
    providerTupleErrors: [],
    activeAttemptCount: 0,
    postResultDesignDrift: false,
    labelLeakage: false,
    thresholdFrozenAfterLabelOrResult: false,
    derivedAt: "2026-08-26T00:36:00.000Z",
  });
  assert.equal(evidence.unauthorizedProviderCall, true);
  assert.equal(evidence.materialDeviation, true);
  assert.equal(evidence.receiptChainValid, true);
  assert.equal(evidence.overallIntegrityDisposition, "INVALID_FOR_GENERALIZATION");
});

test("R5 recovery is explicit, append-only, conservative, and cannot be mistaken for a successful attempt", () => {
  const receipt = buildInterruptedAttemptRecoveryReceiptV5R5({
    activeRunnerRegistrationHash: H("active-r5"),
    authorizationHash: H("authorization"),
    recoveryAuthorizationHash: H("recovery-authorization"),
    reservationHash: H("reservation"),
    requestArtifactHash: H("request"),
    ledgerTerminalHashBeforeRecovery: H("terminal"),
    recoveredProviderEventReceiptHash: H("recovered-provider-event"),
    plannedLedgerCompletionHash: H("planned-ledger-completion"),
    dispatchKnowledge: "UNCERTAIN_AFTER_RESERVATION",
    attemptBudgetConsumed: true,
    tokenAndUsdDisposition: "RESERVED_WORST_CASE_CONSUMED",
    recoveredBy: "FIXTURE_OPERATOR",
    recoveredAt: "2026-08-26T00:37:00.000Z",
  });
  assert.equal(receipt.providerSuccessCreated, false);
  assert.equal(receipt.resumeAllowedAfterLedgerCompletion, true);
  assert.equal(receipt.attemptBudgetConsumed, true);
});

test("R5 workflow state advances through an append-only index supersession visible to a later process", () => {
  const prior = sealV5R3Artifact({
    schemaVersion: "ProtectedWorkflowIndexV1",
    designId: "MAIS-NATURAL-CA60-V5",
    runnerRegistrationHash: H("base-runner"),
    artifactEntries: [],
    createdAt: "2026-08-26T00:30:00.000Z",
  });
  const artifact = sealV5R3Artifact({ schemaVersion: "FixtureDerivedArtifactV1", value: true });
  const next = buildWorkflowIndexSupersessionV5R5({
    activeRunnerRegistrationHash: H("active-r5"),
    priorIndex: prior,
    appendedArtifacts: [{ kind: "CANARY_GATE", relativePath: "canary/gate.json", value: artifact }],
    createdAt: "2026-08-26T00:38:00.000Z",
  });
  assert.equal(next.previousWorkflowIndexHash, prior.selfHash);
  assert.equal(next.artifactEntries.length, 1);
  assert.equal(next.artifactEntries[0].contentHash, sha256V5R3(Buffer.from(canonicalJsonV5R3(artifact), "utf8")));
  assert.equal(next.artifactEntries[0].semanticSelfHash, artifact.selfHash);
});

test("R5 single-category panel agreement reports Cohen kappa as null", () => {
  const pairs = Array.from({ length: 60 }, () => ({ a: "NO_FINDING", b: "NO_FINDING" }));
  const agreement = computeReferenceAgreementV5R5(pairs);
  assert.equal(agreement.rawAgreement, 1);
  assert.equal(agreement.cohenKappa, null);
  assert.equal(agreement.gwetAc1, 1);
});
