import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildAuthenticatedRouteEvidenceV5R5,
  validateAuthenticatedRouteEvidenceV5R5,
} from "../../content-qa/mais-natural-ca60-v1/route-authorization-v5-r5.mjs";
import {
  buildWorkflowIndexSupersessionV5R5,
} from "../../content-qa/mais-natural-ca60-v1/workflow-index-v5-r5.mjs";
import {
  buildC0PredicateInputFromProtectedEvidenceV5R5,
} from "../../content-qa/mais-natural-ca60-v1/c0-trigger-v5-r5.mjs";
import {
  buildDeepSeekPlanReceiptKernelV5R5,
} from "../../content-qa/mais-natural-ca60-v1/state-bound-dispatch-v5-r5.mjs";
import {
  buildProviderRequestArtifactV5R4,
} from "../../content-qa/mais-natural-ca60-v1/provider-request-v5-r4.mjs";
import {
  runCliV5R5,
} from "../../content-qa/mais-natural-ca60-v1/runner-v5-r5-cli.mjs";
import {
  buildAuthorizationFixtureV5R4,
  buildRunnerFixtureV5R4,
} from "../../content-qa/mais-natural-ca60-v1/runner-v5-r4-test-fixtures.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CORE = path.resolve(HERE, "../../content-qa/mais-natural-ca60-v1");
const DESIGN = JSON.parse(readFileSync(path.resolve(HERE,
  "../../research/mais-natural-ca60-v1/versions/design-v5/design-registration.json"), "utf8"));

function canonical(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("non-finite number");
    return JSON.stringify(Object.is(value, -0) ? 0 : value);
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const keys = Object.keys(value).sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
}
function sha256(value) {
  return createHash("sha256").update(Buffer.isBuffer(value) ? value : Buffer.from(String(value), "utf8")).digest("hex");
}
function seal(value) {
  const copy = structuredClone(value);
  delete copy.selfHash;
  copy.selfHash = sha256(canonical(copy));
  return Object.freeze(copy);
}
const H = (value) => sha256(String(value));
const withoutSelfHash = (value) => Object.fromEntries(Object.entries(value).filter(([key]) => key !== "selfHash"));

function callerSource(evidenceKind, common, extra = {}, sourceKind = "PROVIDER_CONSOLE_EXPORT") {
  return {
    evidenceKind,
    sourceKind,
    mediaType: "application/json",
    sourceLocator: `caller-authored://${evidenceKind.toLowerCase()}`,
    sourceBytes: JSON.stringify({ evidenceKind, ...common, ...extra }),
    capturedAt: "2026-08-26T08:00:00.000Z",
    expiresAt: "2026-08-28T08:00:00.000Z",
  };
}

test("caller-authored route/account/billing/region/price JSON can self-confirm without authenticated origin", () => {
  const common = {
    provider: "OPENAI_DIRECT",
    model: "gpt-5.6-luna",
    endpoint: "https://us.api.openai.com/v1/responses",
    projectResidency: "US_STORAGE_PROCESSING",
    subjectIdentityHash: H("caller-selected-subject"),
  };
  const receipt = buildAuthenticatedRouteEvidenceV5R5({
    activeRunnerRegistrationHash: H("active-registration"),
    provider: "OPENAI_DIRECT",
    sources: [
      callerSource("ACCOUNT_PROJECT_IDENTITY", common),
      callerSource("DIRECT_BILLING_ROUTE", common, { directBilling: true }),
      callerSource("DATA_REGION", common, { dataRegion: "US" }),
      callerSource("PRICE", common, { currency: "USD", inputUsdPerMillionTokens: 1, outputUsdPerMillionTokens: 2 }),
      callerSource("ROUTE_PROBE_RESPONSE", common,
        { httpStatus: 200, attemptStatus: "SUCCEEDED", containsNaturalQuestionText: false }),
    ],
    validatedAt: "2026-08-26T08:01:00.000Z",
  });
  assert.deepEqual(validateAuthenticatedRouteEvidenceV5R5({ receipt }), []);
  assert.ok(receipt.sources.every(({ sourceKind }) => sourceKind === "PROVIDER_CONSOLE_EXPORT"));
  assert.ok(receipt.sources.every(({ sourceLocatorHash }) => /^[0-9a-f]{64}$/u.test(sourceLocatorHash)));
  assert.ok(receipt.sources.every((source) => !Object.hasOwn(source, "sourceOriginSignature")));
});

test("DeepSeek planner is positive but any route-resolved authorization contradicts the inherited request tuple", () => {
  const core = buildRunnerFixtureV5R4();
  const fixture = buildAuthorizationFixtureV5R4(core, "DEEPSEEK_DIRECT", {
    referenceSealHash: H("reference-seal"),
    referenceAttemptChainHash: H("reference-attempt-chain"),
  });
  const plan = buildDeepSeekPlanReceiptKernelV5R5({
    registration: core.registration,
    inventory: core.inventory,
    ledgerEntries: [],
    provider: "DEEPSEEK_DIRECT",
    mode: "DEEPSEEK_CANARY",
    canaryGate: null,
    canaryPredicateReceipt: null,
    c0ExecutionSet: null,
    at: "2026-08-26T08:02:00.000Z",
  });
  assert.equal(plan.planStatus, "NEXT_ACTION");
  assert.equal(plan.role, "B_PRIME_CRITIQUE");

  const unresolvedRequest = buildProviderRequestArtifactV5R4({
    registration: fixture.registration,
    authorization: fixture.authorization,
    inventory: fixture.inventory,
    sampleManifest: fixture.sampleManifest,
    itemLeaf: fixture.itemLeaves[0],
    role: "B_PRIME_CRITIQUE",
    attemptId: "fixture-unresolved-residency-request",
    ledgerEntries: [],
  });
  assert.equal(unresolvedRequest.projectResidency, "UNKNOWN_PENDING_ROUTE_PROBE_EVIDENCE");

  const routeCommon = {
    provider: "DEEPSEEK_DIRECT",
    model: "deepseek-v4-pro",
    endpoint: "https://api.deepseek.com/chat/completions",
    projectResidency: "US_STORAGE_PROCESSING",
    subjectIdentityHash: H("resolved-deepseek-subject"),
  };
  const resolvedRoute = buildAuthenticatedRouteEvidenceV5R5({
    activeRunnerRegistrationHash: H("active-registration"),
    provider: "DEEPSEEK_DIRECT",
    sources: [
      callerSource("ACCOUNT_PROJECT_IDENTITY", routeCommon),
      callerSource("DIRECT_BILLING_ROUTE", routeCommon, { directBilling: true }, "PROVIDER_BILLING_EXPORT"),
      callerSource("DATA_REGION", routeCommon, { dataRegion: "US" }, "PROVIDER_RESPONSE"),
      callerSource("PRICE", routeCommon, { currency: "USD", inputUsdPerMillionTokens: 1, outputUsdPerMillionTokens: 2 },
        "PROVIDER_OFFICIAL_RATE_CARD"),
      callerSource("ROUTE_PROBE_RESPONSE", routeCommon,
        { httpStatus: 200, attemptStatus: "SUCCEEDED", containsNaturalQuestionText: false }, "PROVIDER_RESPONSE"),
    ],
    validatedAt: "2026-08-26T08:03:00.000Z",
  });
  assert.equal(resolvedRoute.projectResidency, "US_STORAGE_PROCESSING");
  const resolvedAuthorization = seal({
    ...withoutSelfHash(fixture.authorization),
    projectResidency: resolvedRoute.projectResidency,
  });
  assert.throws(() => buildProviderRequestArtifactV5R4({
    registration: fixture.registration,
    authorization: resolvedAuthorization,
    inventory: fixture.inventory,
    sampleManifest: fixture.sampleManifest,
    itemLeaf: fixture.itemLeaves[0],
    role: "B_PRIME_CRITIQUE",
    attemptId: "fixture-resolved-residency-request",
    ledgerEntries: [],
  }), /provider tuple|frozen authorization/iu);
});

test("missing B-prime outputs cannot be converted into the frozen malformed-or-missing C0 trigger", () => {
  assert.equal(DESIGN.providerControls.deepSeekEnvelope.c0PrimeMalformedOrMissingPredicateDisposition, "TRIGGER");
  assert.throws(() => buildC0PredicateInputFromProtectedEvidenceV5R5({
    item: { itemHash: H("item"), egressEligible: true },
    itemLeaf: { prompt: "synthetic fixture", responseForm: "short-answer", storedAnswer: "1",
      acceptedAnswers: [], region: "CALIFORNIA", curriculumProfile: "US_CA_MATH", difficulty: "Low",
      grade: "G1", canonicalTopic: "FIXTURE", diagram: null, questionAssets: [] },
    critiqueOutput: null,
    revisionOutput: null,
  }), /identities differ/iu);
  const runtime = readFileSync(path.join(CORE, "runner-v5-r5-runtime.mjs"), "utf8");
  assert.match(runtime, /allBaseComplete\s*=.*BASE_ROLES\.every/su);
  assert.match(runtime, /return blocked\("SCORING_BLOCKED"/u);
});

test("legacy FRESH_RUNNER_REVIEW survives adoption and blocks installation of the required V3 review", () => {
  const legacyReview = seal({ schemaVersion: "IndependentExecutionRunnerReviewReceiptV2", decision: "DISCREPANCY" });
  const legacyEntry = {
    kind: "FRESH_RUNNER_REVIEW",
    relativePath: "legacy/reviews/v5-r4.json",
    contentHash: sha256(canonical(legacyReview)),
  };
  const priorIndex = seal({
    schemaVersion: "ProtectedWorkflowIndexV1",
    runnerRegistrationHash: H("v5-r4-registration"),
    artifactEntries: [legacyEntry],
    createdAt: "2026-08-26T07:00:00.000Z",
  });
  const activeRegistration = seal({ schemaVersion: "NaturalCaExecutionRunnerSupersedingRegistrationV1", runnerVersion: "V5-R5" });
  const adopted = buildWorkflowIndexSupersessionV5R5({
    activeRunnerRegistrationHash: H("v5-r5-registration"),
    priorIndex,
    appendedArtifacts: [{ kind: "ACTIVE_RUNNER_REGISTRATION", relativePath: "registrations/v5-r5.json", value: activeRegistration }],
    legacyPriorArtifactValues: new Map([["FRESH_RUNNER_REVIEW", legacyReview]]),
    createdAt: "2026-08-26T07:01:00.000Z",
  });
  const freshR5Review = seal({ schemaVersion: "IndependentExecutionRunnerReviewReceiptV3", decision: "DISCREPANCY" });
  assert.throws(() => buildWorkflowIndexSupersessionV5R5({
    activeRunnerRegistrationHash: H("v5-r5-registration"),
    priorIndex: adopted,
    appendedArtifacts: [{ kind: "FRESH_RUNNER_REVIEW", relativePath: "reviews/v5-r5.json", value: freshR5Review }],
    createdAt: "2026-08-26T07:02:00.000Z",
  }), /artifact kinds must be unique/iu);
});

test("active registration loader dynamically trusts the latest path-touching commit instead of the frozen R5 commit", () => {
  const source = readFileSync(path.join(CORE, "execution-evidence-v5-r5.mjs"), "utf8");
  assert.match(source, /git", \["log", "-n", "1", "--format=%H", "--", relativePath\]/u);
  assert.doesNotMatch(source, /12d65e6d7bf3f4e7da2010b973df0d08fb3a3c4f/u);
  assert.doesNotMatch(source, /6c96a27da2ce36c69d4190db3b6a2fde59c430a250c85417ef2526b25da2bbce/u);
});

test("runtime loader does not reverify the inherited compatibility manifest that supplies execution-critical imports", () => {
  const source = readFileSync(path.join(CORE, "execution-evidence-v5-r5.mjs"), "utf8");
  assert.match(source, /compatibilityBaseProductionSourceRootHash\s*===\s*baseRegistration\?\.productionSourceRootHash/u);
  assert.match(source, /verifyManifestBytes\(activeRegistration\.productionSourceManifest/u);
  assert.doesNotMatch(source, /verifyManifestBytes\(baseRegistration\.productionSourceManifest/u);
  assert.doesNotMatch(source, /verifyManifestBytes\(baseRegistration\.testSourceManifest/u);
});

test("complete raw provider response bytes are hashed and then discarded from durable receipts and role outputs", () => {
  const guarded = readFileSync(path.join(CORE, "guarded-provider-attempt-v5-r5.mjs"), "utf8");
  const runtime = readFileSync(path.join(CORE, "runner-v5-r5-runtime.mjs"), "utf8");
  const eventSchema = JSON.parse(readFileSync(path.join(CORE, "schemas/ProviderEventReceiptV4.schema.json"), "utf8"));
  const outputSchema = JSON.parse(readFileSync(path.join(CORE, "schemas/ProviderRoleOutputV1.schema.json"), "utf8"));
  assert.match(guarded, /rawResponseBody\s*=\s*new TextDecoder/u);
  assert.match(guarded, /responseBodyHash:\s*transportResult\.responseBodyHash/u);
  assert.equal(Object.hasOwn(eventSchema.properties, "rawResponseBody"), false);
  assert.equal(Object.hasOwn(outputSchema.properties, "rawResponseBody"), false);
  assert.doesNotMatch(runtime, /RAW_PROVIDER_RESPONSE|PROVIDER_RESPONSE_BYTES/u);
});

test("CLI exception handling loses already-durable intermediate transition custody", async () => {
  let simulatedDurableTransition = false;
  const context = { activeRegistration: { selfHash: H("active-registration") } };
  const result = await runCliV5R5(["label-openai", "--context", "fixture.json", "--resume"], {
    loadWorkflowContext: async () => context,
    executeOpenAIResumeStep: async () => {
      simulatedDurableTransition = true;
      throw new Error("fixture crash after durable request transition");
    },
  });
  assert.equal(simulatedDurableTransition, true);
  assert.equal(result.receipt.status, "ENGINE_FAIL_CLOSED");
  assert.equal(result.receipt.stateTransitionCommitted, false);
  assert.equal(result.receipt.priorWorkflowIndexHash, null);
  assert.equal(result.receipt.nextWorkflowIndexHash, null);
  assert.deepEqual(result.receipt.derivedArtifactHashes, []);
  assert.equal(result.transitionReceiptPath, null);
});

test("integrity source only treats extra successful calls as extra and can ignore an extra failed out-of-graph attempt", () => {
  const scorer = readFileSync(path.join(CORE, "scorer-v5-r5.mjs"), "utf8");
  assert.match(scorer, /const successful\s*=\s*input\.completedCalls\.filter/u);
  assert.match(scorer, /const extraSuccessfulCalls\s*=\s*successful\.filter/u);
  assert.match(scorer, /unauthorizedProviderCall\s*=\s*nonStateBoundCalls\.length\s*>\s*0\s*\|\|\s*extraSuccessfulCalls\.length\s*>\s*0/u);
  assert.doesNotMatch(scorer, /extraCompletedCalls|extraFailedCalls/u);
});
