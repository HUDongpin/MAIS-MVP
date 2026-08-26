import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAttestedRouteEvidenceV5R7,
  buildProviderCostPreviewV5R7,
  validateAttestedRouteEvidenceV5R7,
  validateProviderCostPreviewV5R7,
} from "./evidence-attestation-v5-r7.mjs";
import {
  sealV5R3Artifact,
  sha256V5R3,
} from "./execution-integrity-v5-r3.mjs";

const REGISTRATION_HASH = "a".repeat(64);
const SUBJECT_HASH = "b".repeat(64);
const AUTHORIZATION_HASH = "c".repeat(64);
const RAW_RESPONSE_ARTIFACT_HASH = "d".repeat(64);
const RAW_RESPONSE_BINDING_HASH = "e".repeat(64);
const REQUEST_BODY_HASH = "f".repeat(64);

const SOURCE_KIND = Object.freeze({
  ACCOUNT_PROJECT_IDENTITY: "PROVIDER_CONSOLE_EXPORT",
  DIRECT_BILLING_ROUTE: "PROVIDER_BILLING_EXPORT",
  DATA_REGION: "PROVIDER_CONSOLE_EXPORT",
  PRICE: "PROVIDER_OFFICIAL_RATE_CARD",
  ROUTE_PROBE_RESPONSE: "PROVIDER_RESPONSE",
});

const CAPTURE_MODE = Object.freeze({
  ACCOUNT_PROJECT_IDENTITY: "AUTHENTICATED_PROVIDER_CONSOLE_EXPORT",
  DIRECT_BILLING_ROUTE: "AUTHENTICATED_PROVIDER_BILLING_EXPORT",
  DATA_REGION: "AUTHENTICATED_PROVIDER_CONSOLE_EXPORT",
  PRICE: "OFFICIAL_RATE_CARD_SNAPSHOT",
  ROUTE_PROBE_RESPONSE: "GUARDED_ZERO_NATURAL_CONTENT_PROBE",
});

function buildRouteFixture() {
  const common = {
    provider: "OPENAI_DIRECT",
    model: "gpt-5.6-luna",
    endpoint: "https://us.api.openai.com/v1/responses",
    subjectIdentityHash: SUBJECT_HASH,
    projectResidency: "US_STORAGE_PROCESSING",
  };
  const claimsByKind = {
    ACCOUNT_PROJECT_IDENTITY: { ...common },
    DIRECT_BILLING_ROUTE: { ...common, directBilling: true },
    DATA_REGION: { ...common, dataRegion: "US" },
    PRICE: {
      ...common,
      currency: "USD",
      inputUsdPerMillionTokens: 1,
      outputUsdPerMillionTokens: 2,
    },
    ROUTE_PROBE_RESPONSE: {
      ...common,
      dataRegion: "US",
      httpStatus: 200,
      attemptStatus: "SUCCEEDED",
      containsNaturalQuestionText: false,
      providerRequestId: "probe-request-1",
    },
  };
  const sourceInputs = Object.entries(claimsByKind).map(([evidenceKind, claims]) => ({
    evidenceKind,
    sourceKind: SOURCE_KIND[evidenceKind],
    mediaType: "application/json",
    sourceLocator: `protected://route-evidence/${evidenceKind}`,
    sourceBytes: JSON.stringify({ evidenceKind, ...claims }),
    capturedAt: "2026-08-26T10:00:00.000Z",
    expiresAt: "2026-08-27T10:00:00.000Z",
  }));
  const captureInputs = sourceInputs.map(({ evidenceKind, capturedAt }) => ({
    evidenceKind,
    acquisitionMode: CAPTURE_MODE[evidenceKind],
    sourceHostname: evidenceKind === "ROUTE_PROBE_RESPONSE" ? "us.api.openai.com" : "platform.openai.com",
    authenticatedSubjectHash: SUBJECT_HASH,
    capturedAt,
  }));
  const routeSource = sourceInputs.find(({ evidenceKind }) => evidenceKind === "ROUTE_PROBE_RESPONSE");
  return buildAttestedRouteEvidenceV5R7({
    activeRunnerRegistrationHash: REGISTRATION_HASH,
    provider: "OPENAI_DIRECT",
    sourceInputs,
    captureInputs,
    compatibilityValidatedAt: "2026-08-26T10:00:10.000Z",
    probe: {
      authorizationHash: AUTHORIZATION_HASH,
      rawResponseArtifactHash: RAW_RESPONSE_ARTIFACT_HASH,
      rawResponseBindingReceiptHash: RAW_RESPONSE_BINDING_HASH,
      requestBodyHash: REQUEST_BODY_HASH,
      responseBodyHash: sha256V5R3(Buffer.from(routeSource.sourceBytes, "utf8")),
      providerRequestId: "probe-request-1",
      startedAt: "2026-08-26T10:00:01.000Z",
      finishedAt: "2026-08-26T10:00:02.000Z",
    },
    attestedBy: "OWNER",
    attestedAt: "2026-08-26T10:01:00.000Z",
    validatedAt: "2026-08-26T10:02:00.000Z",
  });
}

test("R7 route receipt derives every activation claim from retained raw sources and referenced receipts", () => {
  const receipt = buildRouteFixture();

  assert.deepEqual(validateAttestedRouteEvidenceV5R7(receipt), []);
  assert.equal(receipt.schemaVersion, "AuthenticatedRouteEvidenceReceiptV3");
  assert.equal(receipt.subjectIdentityHash, SUBJECT_HASH);
  assert.equal(receipt.projectResidency, "US_STORAGE_PROCESSING");
  assert.equal(receipt.dataRegion, "US");
  assert.equal(receipt.directBillingConfirmed, true);
  assert.equal(receipt.routeProbeContainsNaturalQuestionText, false);
  assert.equal(receipt.claimsDerivedFromProtectedRawBytes, true);
  assert.equal(receipt.captureReceipts.length, 5);
  assert.equal(receipt.routeProbeAttemptReceipt.providerEventCount, 1);
  assert.equal(receipt.routeProbeAttemptReceipt.httpRequestCount, 1);
  assert.equal(receipt.routeProbeAttemptReceipt.credentialReadCount, 1);
});

test("R7 route validation rejects retained-source or referenced-receipt drift", () => {
  const receipt = structuredClone(buildRouteFixture());
  const priceSource = receipt.compatibilityRouteEvidenceReceipt.sources
    .find(({ evidenceKind }) => evidenceKind === "PRICE");
  priceSource.sourceBytes = priceSource.sourceBytes.replace(
    '"outputUsdPerMillionTokens":2',
    '"outputUsdPerMillionTokens":0.01',
  );

  assert.ok(validateAttestedRouteEvidenceV5R7(receipt).length > 0);

  const captureDrift = structuredClone(buildRouteFixture());
  const { selfHash: _discardedSelfHash, ...captureBody } = captureDrift.captureReceipts[0];
  captureDrift.captureReceipts[0] = sealV5R3Artifact({
    ...captureBody,
    sourceArtifactHash: "0".repeat(64),
  });
  assert.ok(validateAttestedRouteEvidenceV5R7(captureDrift).length > 0);
});

test("R7 cost preview recomputes the complete OpenAI envelope and 20 percent buffer", () => {
  const routeEvidence = buildRouteFixture();
  const preview = buildProviderCostPreviewV5R7({
    routeEvidence,
    activeRunnerRegistrationHash: REGISTRATION_HASH,
    provider: "OPENAI_DIRECT",
    maximumSuccessfulCalls: 300,
    maximumAttempts: 610,
    maximumInputTokens: 1_500_000,
    maximumOutputTokens: 2_500_000,
    maximumTokens: 4_000_000,
    maximumEstimatedUsd: 25,
    computedAt: "2026-08-26T10:03:00.000Z",
  });

  assert.equal(preview.worstCaseCostPreviewUsd, 6.5);
  assert.equal(preview.bufferedWorstCaseUsd, 7.8);
  assert.equal(preview.priceEvidenceHash, routeEvidence.selfHash);
  assert.deepEqual(validateProviderCostPreviewV5R7({ routeEvidence, preview }), []);
});

test("R7 cost validation rejects a minimal self-hashed cap declaration", () => {
  const routeEvidence = buildRouteFixture();
  const minimal = sealV5R3Artifact({
    schemaVersion: "FixtureCostPreviewV1",
    activeRunnerRegistrationHash: REGISTRATION_HASH,
    provider: "OPENAI_DIRECT",
    maximumSuccessfulCalls: 300,
    maximumAttempts: 610,
    maximumTokens: 4_000_000,
    maximumEstimatedUsd: 25,
  });

  assert.ok(validateProviderCostPreviewV5R7({ routeEvidence, preview: minimal }).length > 0);
});
