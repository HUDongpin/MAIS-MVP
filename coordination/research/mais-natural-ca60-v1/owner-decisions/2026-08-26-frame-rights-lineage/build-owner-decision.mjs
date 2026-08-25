#!/usr/bin/env node

import { pathToFileURL } from "node:url";

import {
  canonicalJson,
  jcsHash,
} from "../../versions/design-v5/design-contract.mjs";

const DESIGN_ID = "MAIS-NATURAL-CA60-V5";
const REGISTRATION_HASH = "e240f1fb1af588fb3dbf085b8f57af1c41635bdb8576be8019838d4512fa0632";
const OWNER_DECISION_REQUEST_HASH = "2d0e8c24f270aa39292fea1ef8d1d11c4e9bd5d9ecd1bdf5a5bbf5119b964f78";
const RIGHTS_POLICY_HASH = "c7f2832a701d813e928f1fa34f1b74d1d26a62c96f5bdea8be58d8bff134fe66";
const LINEAGE_RULE_HASH = "8130bcd70f3e42332478a284b5a5b54e0c73b9f3696b1c1c06f25254ea0fe449";
const READINESS_RECEIPT_HASH = "079055365655fa51f2d9d60b98d6c405cac323382869b487f1a6540af9edcd7d";
const A22_ENVIRONMENT_RECEIPT_HASH = "4cf55806ab1feaf41679b12785fc67d84c085317928c9cb7abdbf401869c4b99";
const A11_REVIEW_HASH = "8ab31d8269558a9544566e45a90afc8538c35e35567a46a5b38ea9a6d91c6657";
const POTENTIAL_CONTENT_ROOT = "58de40eb4db30ec717aa0758fb3aba8b88e63a2e66f24941fcbc47c9193e9ea3";
const POTENTIAL_CLUSTER_SET_ROOT = "58da62ff9d7d17819dd93672ecf761362554d084b9d030f158dfd4932cf7e9d9";

const ALLOWED_SOURCE_IDS = Object.freeze([
  "california-math-common-core-skill",
  "cde-ca-ccss-math-resources",
  "common-core-state-standards-public-license",
]);

const DENIED_SOURCE_IDS = Object.freeze([
  "caaspp-math-blueprints-and-specifications",
  "caaspp-smarter-balanced-public-assessment-resources",
  "ccss-math-textbook-app",
  "cde-2023-math-framework",
  "cde-copyright-statement",
  "cde-math-instructional-materials-adoption",
  "owner-provided-authorized-us-math-materials",
  "us-copyright-office-ideas-facts-methods",
]);

const EXPLICIT_LIMITATIONS = Object.freeze([
  "FRAME_AND_SAMPLE_FREEZE_ONLY",
  "NO_CREDENTIAL_READ_AUTHORIZATION",
  "NO_OPENAI_OR_DEEPSEEK_PROVIDER_CALL_AUTHORIZATION",
  "NO_TOKEN_AUTHORIZATION",
  "NO_ATTEMPT_AUTHORIZATION",
  "NO_USD_AUTHORIZATION",
  "NO_VISUAL_OR_ASSET_EGRESS",
  "NO_COPYRIGHTED_LONG_FORM_EGRESS",
  "DENIED_SOURCE_RULES_REMAIN_ENFORCED",
]);

function assertCanonicalTimestamp(value, field) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) {
    throw new TypeError(`${field} must be canonical RFC3339 UTC with milliseconds`);
  }
}

function canonicalEqual(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

export function buildOwnerFrameRightsLineageDecisionV1({ recordedAt }) {
  assertCanonicalTimestamp(recordedAt, "recordedAt");
  const authorizationEvidence = Object.freeze({
    schemaVersion: "OwnerFrameRightsLineageAuthorizationEvidenceV1",
    evidenceType: "DIRECT_OWNER_MESSAGE_IN_CURRENT_CODEX_TASK",
    authorizer: "OWNER_USER_IN_CURRENT_CODEX_TASK",
    authorizerIdentityBasis: "THREAD_ROLE_ASSERTION_NOT_EXTERNAL_IDENTITY_VERIFICATION",
    authorizerIdentityExternallyVerified: false,
    approvedOwnerDecisionRequestHash: OWNER_DECISION_REQUEST_HASH,
    approvedRightsPolicyHash: RIGHTS_POLICY_HASH,
    approvedLineageRuleHash: LINEAGE_RULE_HASH,
    explicitLimitations: [...EXPLICIT_LIMITATIONS],
    observedAt: recordedAt,
  });
  const body = {
    schemaVersion: "OwnerFrameRightsLineageDecisionReceiptV1",
    artifactKind: "OWNER_GOVERNANCE_DECISION_NOT_PROVIDER_AUTHORIZATION",
    designId: DESIGN_ID,
    registrationHash: REGISTRATION_HASH,
    decisionStatus: "APPROVED_WITH_EXPLICIT_NON_EXECUTION_LIMITS",
    authorizer: authorizationEvidence.authorizer,
    authorizerIdentityBasis: authorizationEvidence.authorizerIdentityBasis,
    authorizerIdentityExternallyVerified: false,
    ownerDecisionRequestHash: OWNER_DECISION_REQUEST_HASH,
    rightsPolicyHash: RIGHTS_POLICY_HASH,
    lineageRuleHash: LINEAGE_RULE_HASH,
    readinessReceiptHash: READINESS_RECEIPT_HASH,
    a22EnvironmentReceiptHash: A22_ENVIRONMENT_RECEIPT_HASH,
    a11IndependentReadinessReviewHash: A11_REVIEW_HASH,
    potentialEligibleContentRootHash: POTENTIAL_CONTENT_ROOT,
    potentialEligibleClusterSetHash: POTENTIAL_CLUSTER_SET_ROOT,
    allowedSourceIds: [...ALLOWED_SOURCE_IDS],
    deniedSourceIds: [...DENIED_SOURCE_IDS],
    egressScope: "FUTURE_FROZEN_CA60_SAMPLE_ITEMS_FROM_BOUND_POTENTIAL_CONTENT_ROOT_ONLY",
    copyrightedLongFormSourceAllowed: false,
    visualOrAssetEgressAllowed: false,
    contentRightsScopeApprovedForLaterHashBoundExecution: true,
    questionEgressAuthorizedNow: false,
    frameFreezeAuthorized: true,
    sampleFreezeAuthorized: true,
    credentialReadAuthorized: false,
    providerExecutionAuthorized: false,
    tokenAuthorizationCreated: false,
    attemptAuthorizationCreated: false,
    usdAuthorizationCreated: false,
    providerRequestCount: 0,
    credentialReadCount: 0,
    naturalQuestionEgressCount: 0,
    authorizationEvidence,
    authorizationEvidenceHash: jcsHash(authorizationEvidence),
    issuedAt: recordedAt,
    expiresAt: null,
    supersedesOwnerDecisionReceiptHash: null,
  };
  return Object.freeze({ ...body, ownerDecisionReceiptHash: jcsHash(body) });
}

export function validateOwnerFrameRightsLineageDecisionV1(receipt) {
  const errors = [];
  try {
    if (!receipt || typeof receipt !== "object" || Array.isArray(receipt)) {
      return ["owner decision receipt must be an object"];
    }
    const expected = buildOwnerFrameRightsLineageDecisionV1({ recordedAt: receipt.issuedAt });
    if (!canonicalEqual(receipt, expected)) errors.push("owner decision receipt does not match the approved immutable scope");
    const { ownerDecisionReceiptHash, ...body } = receipt;
    if (ownerDecisionReceiptHash !== jcsHash(body)) errors.push("owner decision receipt self-hash mismatch");
    if (receipt.authorizationEvidenceHash !== jcsHash(receipt.authorizationEvidence)) {
      errors.push("owner authorization evidence hash mismatch");
    }
  } catch (error) {
    errors.push(`owner decision validation failed closed: ${error instanceof Error ? error.name : "UnknownError"}`);
  }
  return errors;
}

function parseArgs(argv) {
  if (argv.length !== 2 || argv[0] !== "--recorded-at") {
    throw new TypeError("usage: build-owner-decision.mjs --recorded-at RFC3339_UTC_WITH_MILLISECONDS");
  }
  assertCanonicalTimestamp(argv[1], "recordedAt");
  return argv[1];
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    const receipt = buildOwnerFrameRightsLineageDecisionV1({ recordedAt: parseArgs(process.argv.slice(2)) });
    process.stdout.write(`${canonicalJson(receipt)}\n`);
  } catch (error) {
    process.stderr.write(`${JSON.stringify({
      schemaVersion: "OwnerFrameRightsLineageDecisionFailureV1",
      status: "DECISION_RECORDING_FAILED_CLOSED",
      providerRequestCount: 0,
      credentialReadCount: 0,
      naturalQuestionEgressCount: 0,
      redactedError: error instanceof Error ? error.name : "UnknownError",
    })}\n`);
    process.exitCode = 1;
  }
}
