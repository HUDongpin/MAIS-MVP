import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
} from "../../content-qa/mais-natural-ca60-v1/execution-integrity-v5-r3.mjs";
import {
  validateResumeCustodyV5R8,
} from "../../content-qa/mais-natural-ca60-v1/attempt-recovery-v5-r8.mjs";
import {
  validateFreshRunnerReviewV5R8,
} from "../../content-qa/mais-natural-ca60-v1/review-evidence-v5-r8.mjs";
import {
  createRunnerRuntimeV5R8,
} from "../../content-qa/mais-natural-ca60-v1/runner-v5-r8-runtime.mjs";
import {
  buildTrustedProviderEvidenceEnvelopeV5R8,
  validateTrustedProviderEvidenceEnvelopeV5R8,
} from "../../content-qa/mais-natural-ca60-v1/trusted-provider-evidence-v5-r8.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "../../..");
const CORE = path.join(REPO, "coordination/content-qa/mais-natural-ca60-v1");
const H = (value) => sha256V5R3(`a11-r8:${value}`);
const REG_COMMIT = "ab8e8e8f74fc4f9cffd4dc865b65d800783db4b8";
const SOURCE_COMMIT = "94abd3f1907a43e8378c181d56d8389a1de08020";

function source(name) {
  return readFileSync(path.join(CORE, name), "utf8");
}

function manifestRoot(rows) {
  return sha256V5R3(canonicalJsonV5R3(rows
    .map(({ path: sourcePath, sha256, byteLength }) => [sourcePath, sha256, byteLength])
    .sort((left, right) => left[0] < right[0] ? -1 : left[0] > right[0] ? 1 : 0)));
}

function fakeReviewFixture() {
  const verifierSourceManifest = [
    { path: "caller/fake-verifier.mjs", sha256: H("fake-verifier"), byteLength: 10 },
  ];
  const dependencyLockManifest = [
    { path: "caller/fake-lock.json", sha256: H("fake-lock"), byteLength: 10 },
  ];
  const verifierSourceTreeRoot = manifestRoot(verifierSourceManifest);
  const dependencyLockRoot = manifestRoot(dependencyLockManifest);
  const runtimeRoot = H("runtime-root");
  const derivedAt = "2026-08-26T15:00:00.000Z";
  const staticImportGraphReceipt = sealV5R3Artifact({
    schemaVersion: "IndependentStaticImportGraphReceiptV1",
    designId: "MAIS-NATURAL-CA60-V5",
    runnerVersion: "V5-R8",
    verifierSourceTreeRoot,
    importEdges: [["caller/fake-verifier.mjs", "node:assert"]],
    importEdgeCount: 1,
    forbiddenPrimaryScorerImportCount: 0,
    derivedAt,
  });
  const forbiddenPrimaryScorerPathScanReceipt = sealV5R3Artifact({
    schemaVersion: "ForbiddenPrimaryScorerPathScanReceiptV1",
    designId: "MAIS-NATURAL-CA60-V5",
    runnerVersion: "V5-R8",
    verifierSourceTreeRoot,
    forbiddenPathPatterns: ["scorer-verifier-v5-r8.mjs"],
    scannedPathCount: 1,
    forbiddenPathMatchCount: 0,
    matchedPaths: [],
    derivedAt,
  });
  const commandRuntimeReceipt = sealV5R3Artifact({
    schemaVersion: "IndependentCommandRuntimeReceiptV1",
    designId: "MAIS-NATURAL-CA60-V5",
    runnerVersion: "V5-R8",
    verifierSourceTreeRoot,
    dependencyLockRoot,
    nodeVersion: process.version,
    platform: process.platform,
    commands: [{ argv: [process.execPath, "caller/fake-verifier.mjs"], exitCode: 0,
      stdoutHash: H("fake-stdout"), stderrHash: H("fake-stderr") }],
    allCommandsExitedZero: true,
    derivedAt,
  });
  const independentSourceEnumerationReceipt = sealV5R3Artifact({
    schemaVersion: "IndependentSourceEnumerationReceiptV1",
    designId: "MAIS-NATURAL-CA60-V5",
    runnerVersion: "V5-R8",
    baselineCommit: REG_COMMIT,
    registeredRuntimeSourceEnumerationRootHash: runtimeRoot,
    recomputedRuntimeSourceEnumerationRootHash: runtimeRoot,
    enumeratedPathCount: 1,
    conclusion: "EXACT_MATCH",
    derivedAt,
  });
  const processFields = {
    verifierSourceTreeRoot,
    dependencyLockRoot,
    staticImportGraphHash: staticImportGraphReceipt.selfHash,
    forbiddenPrimaryScorerPathScanHash: forbiddenPrimaryScorerPathScanReceipt.selfHash,
    commandRuntimeHash: commandRuntimeReceipt.selfHash,
    baselineCommit: REG_COMMIT,
    recomputedRuntimeSourceEnumerationRootHash: runtimeRoot,
    independentSourceEnumerationReceiptHash: independentSourceEnumerationReceipt.selfHash,
  };
  const fieldOrder = ["verifierSourceTreeRoot", "dependencyLockRoot", "staticImportGraphHash",
    "forbiddenPrimaryScorerPathScanHash", "commandRuntimeHash", "baselineCommit",
    "recomputedRuntimeSourceEnumerationRootHash", "independentSourceEnumerationReceiptHash"];
  const activeRegistration = {
    selfHash: H("registration"),
    runnerSourceCommit: SOURCE_COMMIT,
    productionSourceRootHash: H("production"),
    testSourceRootHash: H("test"),
    importClosureRootHash: H("closure"),
    runtimeSourceEnumerationRootHash: runtimeRoot,
    registeredAt: "2026-08-26T14:23:32.000Z",
  };
  const review = sealV5R3Artifact({
    schemaVersion: "IndependentExecutionRunnerReviewReceiptV6",
    designId: "MAIS-NATURAL-CA60-V5",
    runnerVersion: "V5-R8",
    reviewedAt: "2026-08-26T15:10:00.000Z",
    decision: "CONCURRED",
    reviewerLane: "A11",
    independentImplementation: true,
    findingCount: 0,
    reviewedRunnerRegistrationHash: activeRegistration.selfHash,
    reviewedRunnerRegistrationCommit: REG_COMMIT,
    reviewedRunnerSourceCommit: SOURCE_COMMIT,
    reviewedProductionSourceRootHash: activeRegistration.productionSourceRootHash,
    reviewedTestSourceRootHash: activeRegistration.testSourceRootHash,
    reviewedImportClosureRootHash: activeRegistration.importClosureRootHash,
    reviewedRemediatedFindingIds: Array.from({ length: 8 }, (_, index) =>
      `A11-R7-${String(index + 1).padStart(3, "0")}`),
    ...processFields,
    processEvidenceRootHash: sha256V5R3(canonicalJsonV5R3(fieldOrder
      .map((field) => [field, processFields[field]]))),
    reviewCustodyPolicy:
      "GIT_OBJECT_SINGLE_ADD_WITH_EXACT_REGISTRATION_PARENT_AND_RECOMPUTED_PROCESS_EVIDENCE",
    credentialReadCount: 0,
    naturalQuestionReadCount: 0,
    providerCallCount: 0,
    naturalQuestionEgressCount: 0,
    tokenCount: 0,
    attemptCount: 0,
    usdSpent: 0,
  });
  return {
    activeRegistration,
    registrationEvidence: { registrationCommit: REG_COMMIT },
    freshReview: review,
    processArtifacts: { verifierSourceManifest, dependencyLockManifest,
      staticImportGraphReceipt, forbiddenPrimaryScorerPathScanReceipt,
      commandRuntimeReceipt, independentSourceEnumerationReceipt },
    reviewCustody: { verifiedFromGitObjects: true, reviewReceiptPathMutationCount: 1,
      reviewCommit: "c".repeat(40), reviewCommitParent: REG_COMMIT,
      reviewReceiptHash: review.selfHash },
  };
}

test("direct activation validation accepts caller-asserted A11 Git custody without reviewer authentication", () => {
  const fixture = fakeReviewFixture();
  assert.deepEqual(validateFreshRunnerReviewV5R8(fixture), []);
  assert.equal(fixture.freshReview.reviewerLane, "A11");
  assert.equal(Object.hasOwn(fixture.freshReview, "reviewerPublicKeyFingerprint"), false);
  assert.equal(Object.hasOwn(fixture.reviewCustody, "commitSignatureVerified"), false);
});

test("a pinned signer can authenticate unsupported route summaries without source/probe bytes", () => {
  const common = {
    schemaVersion: "TrustedProviderEvidenceSourceV1",
    designId: "MAIS-NATURAL-CA60-V5",
    provider: "OPENAI_DIRECT",
    model: "gpt-5.6-luna",
    endpoint: "https://us.api.openai.com/v1/responses",
    subjectIdentityHash: H("subject"),
    authenticatedSource: true,
  };
  const make = (evidenceKind, extra = {}) => sealV5R3Artifact({ ...common, evidenceKind,
    retrievalMode: evidenceKind === "PRICE_SOURCE" ? "OFFICIAL_PROVIDER_RATE_CARD"
      : evidenceKind === "ZERO_CONTENT_PROBE_GRAPH" ? "GUARDED_ZERO_CONTENT_PROBE_GRAPH"
        : "AUTHENTICATED_PROVIDER_EXPORT",
    sourceLocator: `https://caller.invalid/${evidenceKind.toLowerCase()}`,
    contentSha256: H(`unsupported:${evidenceKind}`), ...extra });
  const artifacts = [
    make("ACCOUNT_PROJECT_IDENTITY"),
    make("DIRECT_BILLING_ROUTE", { directBilling: true }),
    make("DATA_REGION", { projectResidency: "US_STORAGE_PROCESSING", dataRegion: "US" }),
    make("PRICE_SOURCE", { currency: "USD", inputUsdPerMillionTokens: 1,
      outputUsdPerMillionTokens: 2 }),
    make("ZERO_CONTENT_PROBE_GRAPH", { graphStatus: "COMPLETE_VALID", providerEventCount: 1,
      httpRequestCount: 1, naturalQuestionContentCount: 0, requestArtifactHash: H("request"),
      providerEventReceiptHash: H("event"), rawResponseArtifactHash: H("raw"),
      rawResponseBindingReceiptHash: H("binding"), resolvedAttemptReceiptHash: H("resolved") }),
  ];
  const price = artifacts.find(({ evidenceKind }) => evidenceKind === "PRICE_SOURCE");
  const probe = artifacts.find(({ evidenceKind }) => evidenceKind === "ZERO_CONTENT_PROBE_GRAPH");
  const claims = { provider: common.provider, model: common.model, endpoint: common.endpoint,
    projectResidency: "US_STORAGE_PROCESSING", dataRegion: "US",
    subjectIdentityHash: common.subjectIdentityHash, directBilling: true,
    priceSnapshotHash: price.selfHash, zeroContentProbeGraphHash: probe.selfHash };
  const activeRunnerRegistrationHash = H("registration");
  const unsigned = buildTrustedProviderEvidenceEnvelopeV5R8({ activeRunnerRegistrationHash,
    claims, evidenceArtifactHashes: artifacts.map(({ selfHash }) => selfHash),
    trustAnchorId: "caller-test-anchor", signatureBase64: null,
    capturedAt: "2026-08-26T15:00:00.000Z", expiresAt: "2026-08-27T15:00:00.000Z" });
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const anchor = { trustAnchorId: "caller-test-anchor", algorithm: "Ed25519",
    publicKeySpkiPem: publicKey.export({ type: "spki", format: "pem" }),
    publicKeyFingerprint: sha256V5R3(publicKey.export({ type: "spki", format: "der" })) };
  const signatureBase64 = sign(null,
    Buffer.from(canonicalJsonV5R3(unsigned.signaturePayload), "utf8"), privateKey).toString("base64");
  const signed = buildTrustedProviderEvidenceEnvelopeV5R8({ activeRunnerRegistrationHash,
    claims, evidenceArtifactHashes: artifacts.map(({ selfHash }) => selfHash),
    trustAnchorId: anchor.trustAnchorId, signatureBase64,
    capturedAt: unsigned.capturedAt, expiresAt: unsigned.expiresAt });
  assert.deepEqual(validateTrustedProviderEvidenceEnvelopeV5R8({ envelope: signed,
    activeRegistration: { selfHash: activeRunnerRegistrationHash,
      trustedProviderEvidenceAnchors: [anchor] }, evidenceArtifacts: artifacts,
    at: "2026-08-26T15:01:00.000Z" }), []);
  assert.ok(artifacts.every((artifact) => !Object.hasOwn(artifact, "sourceBytes")));
  assert.equal(Object.hasOwn(probe, "requestArtifact"), false);
  assert.equal(Object.hasOwn(probe, "providerEventReceipt"), false);
  assert.equal(Object.hasOwn(probe, "rawResponseArtifact"), false);
});

test("resume custody admits an orphan completion and the public runtime cannot persist reconciliation", () => {
  const orphanCompletion = sealV5R3Artifact({ entryType: "DISPATCH_COMPLETED",
    attemptId: "orphan-completion", reservationHash: H("absent-reservation") });
  assert.deepEqual(validateResumeCustodyV5R8({ ledgerEntries: [orphanCompletion],
    attemptCommitIntents: [], resolvedAttemptReceipts: [] }), []);
  const runtime = source("runner-v5-r8-runtime.mjs");
  const cli = source("runner-v5-r8-cli.mjs");
  const workflow = source("workflow-index-v5-r8.mjs");
  assert.match(cli, /RECOVERY_INPUT_LOADER_NOT_BOUND/);
  assert.doesNotMatch(workflow, /attemptCustodyByProvider\s*:/u);
  const reconciliation = runtime.slice(runtime.indexOf("async function reconcileInterruptedAttempt"),
    runtime.indexOf("async function persistScoringBundle"));
  assert.doesNotMatch(reconciliation, /advanceWorkflow|persistResult|transition/u);
});

test("public default runtime has no attempt executor and permanent seal/freeze stubs", async () => {
  const runtimeSource = source("runner-v5-r8-runtime.mjs");
  const cliSource = source("runner-v5-r8-cli.mjs");
  assert.match(runtimeSource, /providerAttemptExecutor = null/);
  assert.match(runtimeSource, /providerAttemptPlanner = null/);
  assert.match(cliSource, /runCliV5R8\(process\.argv\.slice\(2\)\)/);
  assert.equal((runtimeSource.match(/V5_R8_NATIVE_EXACT_PROVIDER_ATTEMPT_EXECUTOR/gu) ?? []).length, 1);
  const runtime = createRunnerRuntimeV5R8();
  assert.equal((await runtime.sealReferenceLabels({})).status,
    "REFERENCE_LABEL_SEAL_REQUIRES_COMPLETED_OPENAI_GRAPH");
  assert.equal((await runtime.freezeDeepSeekExecutionRegistration({})).status,
    "DEEPSEEK_EXECUTION_REGISTRATION_REQUIRES_SEALED_REFERENCE_AND_LIVE_AUTHORITY");
});

test("terminal fallback synthesizes all 60 missing rows from caller base instead of immutable partial custody", () => {
  const runtime = source("runner-v5-r8-runtime.mjs");
  const scorer = source("scorer-verifier-v5-r8.mjs");
  const schema = JSON.parse(readFileSync(path.join(CORE,
    "schemas/TerminalExecutionDecisionReceiptV1.schema.json"), "utf8"));
  assert.match(runtime, /terminalEvidenceBuilder = async \(context\) => context\.terminalEvidenceBase/);
  assert.match(runtime, /buildTerminalMissingItemResultsV5R8/);
  assert.match(scorer, /return Object\.freeze\(input\.inventory\.items\.map/);
  assert.match(scorer, /executionDisposition: "MISSING_RECEIPT"/);
  for (const requiredRoot of ["attemptGraphReceiptHash", "ledgerRootHash", "commandJournalRootHash"]) {
    assert.equal(schema.required.includes(requiredRoot), false, requiredRoot);
  }
});

test("statistical kernel rejects finding IDs reused on different items despite frozen composite key", () => {
  const kernel = source("statistical-kernel-v5-r8.mjs");
  assert.match(kernel, /!globalIds\.has\(finding\.findingId\)/);
  assert.match(kernel, /duplicated across the run/);
  assert.match(kernel, /const globalReferenceIds = new Set\(\)/);
  assert.match(kernel, /const globalMachineIds = new Set\(\)/);
  const design = readFileSync(path.join(REPO,
    "coordination/research/mais-natural-ca60-v1/versions/design-v5/design-registration.json"), "utf8");
  assert.match(design, /stable reference finding leaves keyed by itemId\+findingId\+family\+code/);
  assert.match(design, /UNIQUE\(itemId,findingId,family,code\)/);
});

test("scoring integrity and invalidation flags are accepted from caller input rather than rebuilt", () => {
  const scorer = source("scorer-verifier-v5-r8.mjs");
  for (const field of ["receiptChainValid", "providerTupleValid", "capsValid",
    "terminalProviderFailure", "materialDeviation", "postResultDesignDrift",
    "unauthorizedProviderCall"]) {
    assert.match(scorer, new RegExp(`${field}: input\\.${field}`));
  }
  const runtime = source("runner-v5-r8-runtime.mjs");
  assert.match(runtime, /scoringInputBuilder = async \(context\) => context\.scoringInput/);
});

test("A07 closeout remains conditional and records only the pre-registration skipped suite", () => {
  const log = readFileSync(path.join(REPO,
    "coordination/session-logs/2026-08-26-A07-mais-natural-ca60-v5-r8.md"), "utf8");
  assert.match(log, /24 passed.*2 intentionally skipped/s);
  assert.match(log, /reviewed commit` once the source commit and its immutable direct-child registration commit are created/);
  assert.doesNotMatch(log, /ab8e8e8f74fc4f9cffd4dc865b65d800783db4b8/);
  assert.doesNotMatch(log, /94abd3f1907a43e8378c181d56d8389a1de08020/);
});
