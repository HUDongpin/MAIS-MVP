import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import ACTIVE_REGISTRATION from "../../research/mais-natural-ca60-v1/runner-registrations/v5-r7/runner-registration.json" with { type: "json" };
import {
  validateFreshRunnerReviewV5R7,
} from "../../content-qa/mais-natural-ca60-v1/execution-evidence-v5-r7.mjs";
import {
  buildAttestedRouteEvidenceV5R7,
  validateAttestedRouteEvidenceV5R7,
} from "../../content-qa/mais-natural-ca60-v1/evidence-attestation-v5-r7.mjs";
import {
  reconstructAttemptGraphV5R7,
} from "../../content-qa/mais-natural-ca60-v1/attempt-graph-v5-r7.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../..");
const CORE = path.join(ROOT, "coordination/content-qa/mais-natural-ca60-v1");
const DESIGN = path.join(ROOT, "coordination/research/mais-natural-ca60-v1/versions/design-v5/design-registration.json");

function canonical(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") return JSON.stringify(Object.is(value, -0) ? 0 : value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
}
function hash(value) { return createHash("sha256").update(value).digest("hex"); }
function seal(value) { return { ...value, selfHash: hash(Buffer.from(canonical(value), "utf8")) }; }
function source(name) { return readFileSync(path.join(CORE, name), "utf8"); }

test("a minimal caller-sealed A11 concurrence omitting all frozen process evidence is accepted", () => {
  const fake = seal({
    schemaVersion: "IndependentExecutionRunnerReviewReceiptV5",
    designId: "MAIS-NATURAL-CA60-V5",
    runnerVersion: "V5-R7",
    reviewedAt: "2026-08-26T13:00:00.000Z",
    decision: "CONCURRED",
    reviewerLane: "A11",
    independentImplementation: true,
    findingCount: 0,
    reviewedRunnerRegistrationHash: ACTIVE_REGISTRATION.selfHash,
    reviewedRunnerRegistrationCommit: "aa07d9b72cf06fbcf100ed0f6bf358fedd94222d",
    reviewedRunnerSourceCommit: ACTIVE_REGISTRATION.runnerSourceCommit,
    reviewedProductionSourceRootHash: ACTIVE_REGISTRATION.productionSourceRootHash,
    reviewedTestSourceRootHash: ACTIVE_REGISTRATION.testSourceRootHash,
    reviewedImportClosureRootHash: ACTIVE_REGISTRATION.importClosureRootHash,
    reviewedRemediatedFindingIds: Array.from({ length: 11 }, (_, i) =>
      `A11-R6-${String(i + 1).padStart(3, "0")}`),
    credentialReadCount: 0,
    naturalQuestionReadCount: 0,
    providerCallCount: 0,
    naturalQuestionEgressCount: 0,
    tokenCount: 0,
    attemptCount: 0,
    usdSpent: 0,
  });
  const forbiddenMissing = [
    "verifierSourceTreeRoot", "dependencyLockRoot", "staticImportGraphHash",
    "forbiddenPrimaryScorerImportScanHash", "commandRuntimeHash", "baselineCommit",
    "sourceEnumerationEvidenceContractHash", "independentSourceEnumerationReceiptHash",
  ];
  assert.ok(forbiddenMissing.every((field) => !(field in fake)));
  const errors = validateFreshRunnerReviewV5R7({
    activeRegistration: ACTIVE_REGISTRATION,
    registrationEvidence: { registrationCommit: "aa07d9b72cf06fbcf100ed0f6bf358fedd94222d" },
    freshReview: fake,
  });
  assert.deepEqual(errors, []);
});

test("caller-authored route/account/billing/region/price/probe claims validate as authenticated", () => {
  const registration = "a".repeat(64);
  const subject = "b".repeat(64);
  const common = {
    provider: "OPENAI_DIRECT",
    model: "gpt-5.6-luna",
    endpoint: "https://us.api.openai.com/v1/responses",
    subjectIdentityHash: subject,
    projectResidency: "US_STORAGE_PROCESSING",
  };
  const claims = {
    ACCOUNT_PROJECT_IDENTITY: { ...common },
    DIRECT_BILLING_ROUTE: { ...common, directBilling: true },
    DATA_REGION: { ...common, dataRegion: "US" },
    PRICE: { ...common, currency: "USD", inputUsdPerMillionTokens: 1, outputUsdPerMillionTokens: 2 },
    ROUTE_PROBE_RESPONSE: { ...common, dataRegion: "US", httpStatus: 200, attemptStatus: "SUCCEEDED",
      containsNaturalQuestionText: false, providerRequestId: "caller-authored-probe" },
  };
  const kinds = {
    ACCOUNT_PROJECT_IDENTITY: "PROVIDER_CONSOLE_EXPORT",
    DIRECT_BILLING_ROUTE: "PROVIDER_BILLING_EXPORT",
    DATA_REGION: "PROVIDER_CONSOLE_EXPORT",
    PRICE: "PROVIDER_OFFICIAL_RATE_CARD",
    ROUTE_PROBE_RESPONSE: "PROVIDER_RESPONSE",
  };
  const modes = {
    ACCOUNT_PROJECT_IDENTITY: "AUTHENTICATED_PROVIDER_CONSOLE_EXPORT",
    DIRECT_BILLING_ROUTE: "AUTHENTICATED_PROVIDER_BILLING_EXPORT",
    DATA_REGION: "AUTHENTICATED_PROVIDER_CONSOLE_EXPORT",
    PRICE: "OFFICIAL_RATE_CARD_SNAPSHOT",
    ROUTE_PROBE_RESPONSE: "GUARDED_ZERO_NATURAL_CONTENT_PROBE",
  };
  const sourceInputs = Object.entries(claims).map(([evidenceKind, value]) => ({
    evidenceKind,
    sourceKind: kinds[evidenceKind],
    mediaType: "application/json",
    sourceLocator: `caller://fabricated/${evidenceKind}`,
    sourceBytes: JSON.stringify({ evidenceKind, ...value }),
    capturedAt: "2026-08-26T10:00:00.000Z",
    expiresAt: "2026-08-27T10:00:00.000Z",
  }));
  const captureInputs = sourceInputs.map(({ evidenceKind, capturedAt }) => ({
    evidenceKind,
    acquisitionMode: modes[evidenceKind],
    sourceHostname: evidenceKind === "ROUTE_PROBE_RESPONSE" ? "us.api.openai.com" : "platform.openai.com",
    authenticatedSubjectHash: subject,
    capturedAt,
  }));
  const routeSource = sourceInputs.find((row) => row.evidenceKind === "ROUTE_PROBE_RESPONSE");
  const receipt = buildAttestedRouteEvidenceV5R7({
    activeRunnerRegistrationHash: registration,
    provider: "OPENAI_DIRECT",
    sourceInputs,
    captureInputs,
    compatibilityValidatedAt: "2026-08-26T10:00:10.000Z",
    probe: {
      authorizationHash: "c".repeat(64),
      rawResponseArtifactHash: "d".repeat(64),
      rawResponseBindingReceiptHash: "e".repeat(64),
      requestBodyHash: "f".repeat(64),
      responseBodyHash: hash(Buffer.from(routeSource.sourceBytes, "utf8")),
      providerRequestId: "caller-authored-probe",
      startedAt: "2026-08-26T10:00:01.000Z",
      finishedAt: "2026-08-26T10:00:02.000Z",
    },
    attestedBy: "OWNER",
    attestedAt: "2026-08-26T10:01:00.000Z",
    validatedAt: "2026-08-26T10:02:00.000Z",
  });
  assert.deepEqual(validateAttestedRouteEvidenceV5R7(receipt), []);
  assert.equal(receipt.evidenceDisposition,
    "OWNER_ATTESTED_PARSED_RAW_SOURCES_PLUS_GUARDED_ZERO_CONTENT_PROBE");
});

test("attempt graph accepts a dangling fabricated raw artifact", () => {
  const h = (character) => character.repeat(64);
  const compatibilityAuthorization = {
    selfHash: h("d"), maximumAttempts: 610, concurrencyCap: 4, maximumSuccessfulCalls: 300,
    maximumInputTokens: 4_000_000, maximumOutputTokens: 4_000_000, maximumTokens: 4_000_000,
    maximumEstimatedUsd: 25, maximumAttemptsPerItemRole: 2,
  };
  const graph = reconstructAttemptGraphV5R7({
    activeRegistration: { selfHash: h("a") },
    authorization: { selfHash: h("b"), compatibilityAuthorization,
      compatibilityAuthorizationHash: h("d"), provider: "OPENAI_DIRECT" },
    inventory: { selfHash: h("c") },
    ledgerEntries: [], requestArtifacts: [], dispatchAudits: [], semanticDispatchAuthorities: [],
    dispatchPermits: [], compatibilityDispatchPermits: [],
    rawResponseArtifacts: [{ selfHash: h("e"), fabricated: true }],
    rawResponseBindingReceipts: [], attemptCommitIntents: [], resolvedAttemptReceipts: [],
    derivedAt: "2026-08-26T00:00:00.000Z",
  });
  assert.equal(graph.receipt.graphStatus, "COMPLETE_VALID");
  assert.deepEqual(graph.receipt.lineageErrors, []);
});

test("frozen scorer is still the legacy stateful 32-bit PRNG and omits required metric bootstrap coverage", () => {
  const verifier = source("scorer-verifier-v5-r7.mjs");
  const scorer = source("scorer-v5-r3.mjs");
  const design = readFileSync(DESIGN, "utf8");
  assert.match(verifier, /scoreNaturalCaV5R3/);
  assert.match(scorer, /Number\.parseInt\(hash\.slice\(0, 8\), 16\)/);
  assert.match(scorer, /state \+= 0x6d2b79f5/);
  assert.doesNotMatch(scorer, /ca60-bootstrap-prng-v1/);
  assert.match(design, /Counter-based SHA-256 over registrationHash\|metric\|replicate\|draw\|rejection/);
  const bootstrapBody = scorer.slice(scorer.indexOf("function clusterBootstrap"),
    scorer.indexOf("function minimumMetric"));
  assert.match(bootstrapBody, /familyLower95.*exactLower95.*precisionLower95/s);
  assert.doesNotMatch(bootstrapBody, /p1|p2/i);
});

test("57-59-item and unresolved cases are blocked or imputed rather than evaluated under frozen rules", () => {
  const runtime = source("runner-v5-r7-runtime.mjs");
  const verifier = source("scorer-verifier-v5-r7.mjs");
  assert.match(runtime, /built\.receipt\.graphStatus === "COMPLETE_VALID"/);
  assert.match(runtime, /expectedSuccessfulCount = 120\s*\+ c0State\.c0ExecutionSet\.selectedItemHashes\.length \* C0_ROLES\.length/);
  assert.match(runtime, /INCOMPLETE_EXECUTION_NO_METRIC_INFERENCE/);
  assert.doesNotMatch(runtime, /ItemEvaluationResultV1/);
  assert.match(runtime, /naturalQuestionResultCount: 60/);
  assert.match(verifier, /machineFindings = \[\]/);
  assert.match(verifier, /referenceUnresolvedCount \+ machineUnresolvedCount/);
});

test("terminal integrity failure returns only a blocked value and no authoritative decision receipt", () => {
  const runtime = source("runner-v5-r7-runtime.mjs");
  const cli = source("runner-v5-r7-cli.mjs");
  const blockedSection = runtime.slice(runtime.indexOf("INCOMPLETE_EXECUTION_NO_METRIC_INFERENCE") - 900,
    runtime.indexOf("INCOMPLETE_EXECUTION_NO_METRIC_INFERENCE") + 900);
  assert.match(blockedSection, /return blocked\(/);
  assert.doesNotMatch(blockedSection, /storeArtifact|appendTransition|sealV5R3Artifact/);
  assert.doesNotMatch(cli, /terminalEvidenceCode/);
});

test("public CLI has no interrupted-attempt reconciliation command", () => {
  const cli = source("runner-v5-r7-cli.mjs");
  const runtime = source("runner-v5-r7-runtime.mjs");
  assert.doesNotMatch(cli, /recover|reconcile|stale-lock/i);
  assert.doesNotMatch(runtime, /recoverIntentBoundCompletion/);
  assert.match(source("atomic-execution-ledger-v5-r7.mjs"), /recoverIntentBoundCompletion/);
});

test("registered A07 handoff log is pre-closeout and omits exact final R7 identities", () => {
  const log = readFileSync(path.join(ROOT,
    "coordination/session-logs/2026-08-26-A07-mais-natural-ca60-v5-r7.md"), "utf8");
  assert.doesNotMatch(log, /aa07d9b72cf06fbcf100ed0f6bf358fedd94222d/);
  assert.doesNotMatch(log, /237413734a41431e51c8a29ecef6628b67bbafb1/);
  assert.doesNotMatch(log, /97b65940b0573064b4d1206e1f80dfb555c1a41e6c782e7439f9ec53df66b003/);
  assert.match(log, /then request a fresh A11 review/);
});
