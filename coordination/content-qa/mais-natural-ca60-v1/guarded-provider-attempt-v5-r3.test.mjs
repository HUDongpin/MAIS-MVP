import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { createAtomicExecutionLedgerV5R3 } from "./atomic-execution-ledger-v5-r3.mjs";
import {
  buildAuthorizationEvidenceHashV5R3,
  buildDeepSeekExecutionRegistrationV1,
  buildSampleExecutionInventoryV1,
  buildRunnerReviewReceiptV2,
  canonicalJsonV5R3,
  egressPolicyHashV5R3,
  roleReservationPolicyHashV5R3,
  sealV5R3Artifact,
  sha256V5R3,
} from "./execution-integrity-v5-r3.mjs";
import { runGuardedProviderAttemptV5R3 } from "./guarded-provider-attempt-v5-r3.mjs";

const H = (character) => character.repeat(64);

function setup(provider = "OPENAI_DIRECT", reviewDecision = "CONCURRED") {
  const inventoryItems = Array.from({ length: 60 }, (_, index) => ({
    itemHash: sha256V5R3(`item-${index}`),
    itemIdPseudonym: `item-${index + 1}`,
    clusterId: `cluster-${index + 1}`,
    privacyScreenEvidenceHash: sha256V5R3(`privacy-${index}`),
    rightsScreenEvidenceHash: sha256V5R3(`rights-${index}`),
    egressEligible: true,
  }));
  const sortedInventoryItems = [...inventoryItems].sort((left, right) => left.itemHash < right.itemHash ? -1 : left.itemHash > right.itemHash ? 1 : 0);
  const registration = sealV5R3Artifact({
    schemaVersion: "NaturalCaExecutionRunnerRegistrationV2",
    runnerVersion: "V5-R3",
    designId: "MAIS-NATURAL-CA60-V5",
    registeredAt: "2026-08-26T03:00:00.000Z",
    runnerSourceCommit: "c".repeat(40),
    productionSourceRootHash: H("1"),
    testSourceRootHash: H("2"),
    frameRegistrationHash: H("3"),
    sampleManifestHash: H("4"),
    samplePayloadSetHash: sha256V5R3(canonicalJsonV5R3(sortedInventoryItems.map(({ itemHash }) => itemHash))),
    privacyScreenHash: sha256V5R3(canonicalJsonV5R3(sortedInventoryItems.map(({ itemHash, privacyScreenEvidenceHash }) => [itemHash, privacyScreenEvidenceHash]))),
    rightsScreenHash: sha256V5R3(canonicalJsonV5R3(sortedInventoryItems.map(({ itemHash, rightsScreenEvidenceHash }) => [itemHash, rightsScreenEvidenceHash]))),
    providerContractErratumHash: H("8"),
  });
  const sampleExecutionInventory = buildSampleExecutionInventoryV1({ registration, items: inventoryItems });
  const review = buildRunnerReviewReceiptV2({
    reviewedAt: "2026-08-26T03:30:00.000Z",
    decision: reviewDecision,
    reviewedRegistration: registration,
    reviewerLane: "A11",
    findingCount: reviewDecision === "CONCURRED" ? 0 : 1,
  });
  const priceSnapshot = sealV5R3Artifact({
    schemaVersion: "ProviderPriceSnapshotV1",
    provider,
    model: provider === "OPENAI_DIRECT" ? "gpt-5.6-luna" : "deepseek-v4-pro",
    currency: "USD",
    inputUsdPerMillionTokens: 1,
    outputUsdPerMillionTokens: 2,
    capturedAt: "2026-08-26T03:45:00.000Z",
  });
  const routeReceipt = sealV5R3Artifact({
    schemaVersion: provider === "OPENAI_DIRECT" ? "OpenAIProjectRoutePreflightReceiptV2" : "DeepSeekDirectRouteProbeReceiptV1",
    provider,
    ...(provider === "OPENAI_DIRECT" ? { preflightStatus: "CONFIRMED" } : { probeStatus: "CONFIRMED" }),
    containsNaturalQuestionText: false,
    registrationHash: registration.selfHash,
    ...(provider === "OPENAI_DIRECT" ? { projectIdentityHash: H("9") } : {}),
  });
  const model = provider === "OPENAI_DIRECT" ? "gpt-5.6-luna" : "deepseek-v4-pro";
  const endpoint = provider === "OPENAI_DIRECT" ? "https://us.api.openai.com/v1/responses" : "https://api.deepseek.com/chat/completions";
  const role = provider === "OPENAI_DIRECT" ? "A_SOLVE" : "B_PRIME_CRITIQUE";
  const caps = {
    maximumAttempts: 2,
    maximumSuccessfulCalls: 1,
    maximumInputTokens: 500,
    maximumOutputTokens: 500,
    maximumTokens: 1000,
    maximumEstimatedUsd: 1,
    concurrencyCap: 1,
    maximumAttemptsPerRole: 2,
  };
  const roleReservationPolicy = { [role]: { inputTokens: 100, outputTokens: 100 } };
  const egressAllowlist = provider === "OPENAI_DIRECT"
    ? ["prompt", "options", "locale", "grade", "topic", "responseForm", "storedAnswer", "acceptedAnswers", "explanation", "itemSolveArtifact", "aSolveArtifact", "aLabelArtifact", "bSolveArtifact", "bLabelArtifact"]
    : ["prompt", "options", "storedAnswer", "acceptedAnswers", "explanation", "rubric", "difficulty", "itemPseudonym", "bPrimeCritiqueArtifact"];
  const egressDenylist = ["OPENAI_REFERENCE_FINAL_REFERENCE_TO_DEEPSEEK", "DEEPSEEK_OUTPUT_TO_OPENAI_REFERENCE", "SOURCE_PATH", "GIT_METADATA", "CREDENTIAL", "STUDENT_OR_USER_DATA", "OTHER_ITEM", "UNAUTHORIZED_COPYRIGHT_CONTENT", "INTERNAL_RESEARCH_RECORD"];
  const nonAuthorizations = ["NO_DEPLOYMENT", "NO_LIVE_QUESTION_BANK_MUTATION", "NO_GIT_MUTATION", "NO_MODEL_FALLBACK", "NO_BUDGET_TRANSFER", "NO_PROMPT_TUNING", "NO_RESULT_DEPENDENT_REPLACEMENT"];
  const egressPolicyHash = egressPolicyHashV5R3({ provider, egressAllowlist, egressDenylist });
  const roleReservationPolicyHash = roleReservationPolicyHashV5R3(roleReservationPolicy);
  const ownerGrant = sealV5R3Artifact({
    schemaVersion: "OwnerProviderGrantV1",
    runnerRegistrationHash: registration.selfHash,
    freshRunnerReviewHash: review.selfHash,
    provider,
    model,
    endpoint,
    routeReceiptHash: routeReceipt.selfHash,
    priceSnapshotHash: priceSnapshot.selfHash,
    issuedAt: "2026-08-26T04:00:00.000Z",
    expiresAt: "2026-08-27T04:00:00.000Z",
    authorizedBy: "OWNER_FIXTURE",
    sampleExecutionInventoryHash: sampleExecutionInventory.selfHash,
    egressPolicyHash,
    roleReservationPolicyHash,
    ...caps,
  });
  const credentialReadinessReceipt = sealV5R3Artifact({
    schemaVersion: "CredentialReadinessReceiptV1",
    provider,
    targetEnvironment: "FIXTURE_ONLY",
    status: "READY_REDACTED_NO_VALUE_RECORDED",
    credentialValueRecorded: false,
  });
  const authorizationEvidenceHash = buildAuthorizationEvidenceHashV5R3({ ownerGrant, credentialReadinessReceipt, routeReceipt, priceSnapshot });
  const authorization = sealV5R3Artifact({
    schemaVersion: "ProviderAuthorizationV3",
    authorizationKind: provider === "OPENAI_DIRECT" ? "OPENAI_REFERENCE_LABELING" : "DEEPSEEK_EVALUATION",
    designId: "MAIS-NATURAL-CA60-V5",
    runnerRegistrationHash: registration.selfHash,
    runnerSourceCommit: registration.runnerSourceCommit,
    productionSourceRootHash: registration.productionSourceRootHash,
    testSourceRootHash: registration.testSourceRootHash,
    freshRunnerReviewHash: review.selfHash,
    frameRegistrationHash: registration.frameRegistrationHash,
    sampleManifestHash: registration.sampleManifestHash,
    samplePayloadSetHash: registration.samplePayloadSetHash,
    privacyScreenHash: registration.privacyScreenHash,
    rightsScreenHash: registration.rightsScreenHash,
    providerContractErratumHash: registration.providerContractErratumHash,
    issuedAt: "2026-08-26T04:00:00.000Z",
    expiresAt: "2026-08-27T04:00:00.000Z",
    provider,
    model,
    endpoint,
    projectResidency: provider === "OPENAI_DIRECT" ? "US_STORAGE_PROCESSING" : "UNKNOWN_PENDING_ROUTE_PROBE_EVIDENCE",
    roleSet: [role],
    routeReceiptHash: routeReceipt.selfHash,
    projectIdentityHash: provider === "OPENAI_DIRECT" ? routeReceipt.projectIdentityHash : null,
    priceSnapshotHash: priceSnapshot.selfHash,
    ownerGrantHash: ownerGrant.selfHash,
    credentialReadinessReceiptHash: credentialReadinessReceipt.selfHash,
    authorizationEvidenceHash,
    sampleExecutionInventoryHash: sampleExecutionInventory.selfHash,
    egressAllowlist,
    egressDenylist,
    egressPolicyHash,
    roleReservationPolicyHash,
    authorizedBy: "OWNER_FIXTURE",
    currency: "USD",
    nonAuthorizations,
    credentialReadAuthorized: true,
    providerExecutionAuthorized: true,
    naturalQuestionEgressAuthorized: true,
    tokenAuthorizationCreated: true,
    attemptAuthorizationCreated: true,
    usdAuthorizationCreated: true,
    ...caps,
    roleReservationPolicy,
  });
  const request = sealV5R3Artifact({
    schemaVersion: provider === "OPENAI_DIRECT" ? "OpenAIReferenceRequestV5R3" : "DeepSeekEvaluationRequestV5R3",
    provider,
    model,
    endpoint,
    role,
    attemptId: "attempt-1",
    itemHash: inventoryItems[0].itemHash,
    itemIdPseudonym: inventoryItems[0].itemIdPseudonym,
    clusterId: inventoryItems[0].clusterId,
    sampleManifestHash: registration.sampleManifestHash,
    samplePayloadSetHash: registration.samplePayloadSetHash,
    privacyScreenHash: registration.privacyScreenHash,
    rightsScreenHash: registration.rightsScreenHash,
    referenceInputCount: 0,
    deepSeekInputCount: 0,
    wireRequest: { model, input: [] },
  });
  return { registration, review, priceSnapshot, routeReceipt, ownerGrant, credentialReadinessReceipt, authorization, request, sampleExecutionInventory };
}

test("DISCREPANCY review blocks before reservation, credential access, or transport", async () => {
  const fixture = setup("OPENAI_DIRECT", "DISCREPANCY");
  let reserves = 0;
  let transports = 0;
  const result = await runGuardedProviderAttemptV5R3({
    ...fixture,
    now: "2026-08-26T04:10:00.000Z",
    ledger: { reserve: async () => { reserves += 1; } },
    transport: { send: async () => { transports += 1; } },
    parseResponse: () => ({}),
  });
  assert.equal(result.status, "AUTHORIZATION_BLOCKED");
  assert.equal(reserves, 0);
  assert.equal(transports, 0);
  assert.match(result.errors.join("\n"), /CONCURRED/u);
});

test("an out-of-sample or rights/privacy-unproven item blocks before reservation and transport", async () => {
  const fixture = setup();
  fixture.request = sealV5R3Artifact({
    ...Object.fromEntries(Object.entries(fixture.request).filter(([key]) => key !== "selfHash")),
    itemHash: H("f"),
  });
  let reserves = 0;
  let transports = 0;
  const result = await runGuardedProviderAttemptV5R3({
    ...fixture,
    now: "2026-08-26T04:10:00.000Z",
    ledger: { reserve: async () => { reserves += 1; } },
    transport: { send: async () => { transports += 1; } },
    parseResponse: () => ({}),
  });
  assert.equal(result.status, "AUTHORIZATION_BLOCKED");
  assert.equal(reserves, 0);
  assert.equal(transports, 0);
  assert.match(result.errors.join("\n"), /inventory|sample|rights|privacy/u);
});

test("authorized success reserves atomically before dispatch and embeds the event receipt in completion", async () => {
  const fixture = setup();
  const root = await mkdtemp(path.join(tmpdir(), "ca60-v5-r3-attempt-"));
  const ledger = await createAtomicExecutionLedgerV5R3({ root, authorization: fixture.authorization, priceSnapshot: fixture.priceSnapshot });
  const order = [];
  const reserve = ledger.reserve;
  const complete = ledger.complete;
  const observedLedger = {
    reserve: async (input) => { order.push("reserve"); return reserve(input); },
    complete: async (input) => { order.push("complete"); return complete(input); },
  };
  const transport = {
    send: async () => {
      order.push("credential-and-transport");
      return {
        transportStatus: "DELIVERED",
        bodyReadStatus: "BODY_READ_COMPLETE",
        providerEventCount: 1,
        httpRequestCount: 1,
        observedEndpoint: fixture.authorization.endpoint,
        httpStatus: 200,
        rawResponseBody: JSON.stringify({ model: fixture.authorization.model, finish_reason: "completed", usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 }, output: [] }),
      };
    },
  };
  const result = await runGuardedProviderAttemptV5R3({
    ...fixture,
    now: "2026-08-26T04:10:00.000Z",
    completedAt: "2026-08-26T04:10:01.000Z",
    ledger: observedLedger,
    transport,
    parseResponse: ({ responseEnvelope }) => ({
      observedModel: responseEnvelope.model,
      finishReason: responseEnvelope.finish_reason,
      parsedPayload: { valid: true },
      parsedPayloadHash: H("f"),
    }),
  });
  assert.equal(result.status, "SUCCEEDED");
  assert.deepEqual(order, ["reserve", "credential-and-transport", "complete"]);
  assert.equal(result.providerEventReceipt.totalTokens, 15);
  assert.equal(result.completion.providerEventReceipt.selfHash, result.providerEventReceipt.selfHash);
  assert.deepEqual((await ledger.verify()).errors, []);
});

test("schema-invalid but billable 200, body-read failure, model drift, and finish drift all complete receipts", async (t) => {
  const cases = [
    {
      name: "schema-invalid billable",
      transport: { transportStatus: "DELIVERED", bodyReadStatus: "BODY_READ_COMPLETE", providerEventCount: 1, httpRequestCount: 1, httpStatus: 200, rawResponseBody: JSON.stringify({ model: "gpt-5.6-luna", finish_reason: "completed", usage: { input_tokens: 20, output_tokens: 10, total_tokens: 30 } }) },
      parseResponse: () => { throw new Error("schema invalid"); },
      expected: "SCHEMA_FAILURE",
      tokens: 30,
    },
    {
      name: "body read",
      transport: { transportStatus: "BODY_READ_FAILED_AFTER_DISPATCH", bodyReadStatus: "BODY_READ_FAILED_AFTER_DISPATCH", providerEventCount: 1, httpRequestCount: 1, httpStatus: 200, rawResponseBody: null },
      parseResponse: () => ({}),
      expected: "BODY_READ_FAILED_AFTER_DISPATCH",
      tokens: null,
    },
    {
      name: "model drift",
      transport: { transportStatus: "DELIVERED", bodyReadStatus: "BODY_READ_COMPLETE", providerEventCount: 1, httpRequestCount: 1, httpStatus: 200, rawResponseBody: JSON.stringify({ model: "wrong-model", finish_reason: "completed", usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 } }) },
      parseResponse: ({ responseEnvelope }) => ({ observedModel: responseEnvelope.model, finishReason: responseEnvelope.finish_reason, parsedPayload: {} }),
      expected: "MODEL_DRIFT",
      tokens: 2,
    },
    {
      name: "finish drift",
      transport: { transportStatus: "DELIVERED", bodyReadStatus: "BODY_READ_COMPLETE", providerEventCount: 1, httpRequestCount: 1, httpStatus: 200, rawResponseBody: JSON.stringify({ model: "gpt-5.6-luna", finish_reason: "length", usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 } }) },
      parseResponse: ({ responseEnvelope }) => ({ observedModel: responseEnvelope.model, finishReason: responseEnvelope.finish_reason, parsedPayload: {} }),
      expected: "FINISH_REASON_DRIFT",
      tokens: 2,
    },
  ];
  for (const [index, entry] of cases.entries()) await t.test(entry.name, async () => {
    const fixture = setup();
    fixture.request = sealV5R3Artifact({ ...Object.fromEntries(Object.entries(fixture.request).filter(([key]) => key !== "selfHash")), attemptId: `attempt-${index + 1}` });
    const root = await mkdtemp(path.join(tmpdir(), "ca60-v5-r3-failure-"));
    const ledger = await createAtomicExecutionLedgerV5R3({ root, authorization: fixture.authorization, priceSnapshot: fixture.priceSnapshot });
    const result = await runGuardedProviderAttemptV5R3({
      ...fixture,
      now: "2026-08-26T04:10:00.000Z",
      completedAt: "2026-08-26T04:10:01.000Z",
      ledger,
      transport: { send: async () => ({ ...entry.transport, observedEndpoint: fixture.authorization.endpoint }) },
      parseResponse: entry.parseResponse,
    });
    assert.equal(result.status, entry.expected);
    assert.equal(result.providerEventReceipt.totalTokens, entry.tokens);
    assert.equal(result.providerEventReceipt.attemptStatus, entry.expected);
    if (entry.expected === "MODEL_DRIFT" || entry.expected === "FINISH_REASON_DRIFT" || entry.expected === "SCHEMA_FAILURE") {
      assert.equal(result.providerEventReceipt.transportStatus, "DELIVERED");
    }
    assert.equal(result.completion.providerEventReceiptHash, result.providerEventReceipt.selfHash);
    assert.deepEqual((await ledger.verify()).errors, []);
  });
});

test("DeepSeek random 64-hex execution hash is rejected; a complete self-hashed registration is accepted", async () => {
  const fixture = setup("DEEPSEEK_DIRECT");
  let reserves = 0;
  const blocked = await runGuardedProviderAttemptV5R3({
    ...fixture,
    executionRegistration: { selfHash: H("f") },
    now: "2026-08-26T04:10:00.000Z",
    ledger: { reserve: async () => { reserves += 1; } },
    transport: { send: async () => ({}) },
    parseResponse: () => ({}),
  });
  assert.equal(blocked.status, "AUTHORIZATION_BLOCKED");
  assert.equal(reserves, 0);
  assert.match(blocked.errors.join("\n"), /execution registration/u);

  const executionRegistration = buildDeepSeekExecutionRegistrationV1({
    registeredAt: "2026-08-26T04:30:00.000Z",
    runnerRegistration: fixture.registration,
    runnerReview: fixture.review,
    authorization: fixture.authorization,
    referenceSealHash: H("b"),
    referenceAttemptChainHash: H("c"),
    frameRegistrationHash: fixture.registration.frameRegistrationHash,
    sampleManifestHash: fixture.registration.sampleManifestHash,
    routeReceiptHash: fixture.routeReceipt.selfHash,
    adapterHash: H("d"),
  });
  assert.match(executionRegistration.selfHash, /^[0-9a-f]{64}$/u);
});
