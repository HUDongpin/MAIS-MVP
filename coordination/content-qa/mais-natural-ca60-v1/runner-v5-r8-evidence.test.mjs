import assert from "node:assert/strict";
import test from "node:test";

import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  buildIndependentRunnerReviewReceiptV5R8,
  validateFreshRunnerReviewV5R8,
} from "./review-evidence-v5-r8.mjs";

const H = (value) => sha256V5R3(`r8-evidence:${value}`);
const SOURCE_COMMIT = "a".repeat(40);
const REGISTRATION_COMMIT = "b".repeat(40);

function manifestRoot(rows) {
  return sha256V5R3(canonicalJsonV5R3(rows
    .map(({ path, sha256, byteLength }) => [path, sha256, byteLength])
    .sort((left, right) => left[0] < right[0] ? -1 : left[0] > right[0] ? 1 : 0)));
}

function reviewFixture() {
  const verifierSourceManifest = [
    { path: "independent/verifier.mjs", sha256: H("verifier-source"), byteLength: 431 },
  ];
  const dependencyLockManifest = [
    { path: "independent/package-lock.json", sha256: H("dependency-lock"), byteLength: 912 },
  ];
  const verifierSourceTreeRoot = manifestRoot(verifierSourceManifest);
  const dependencyLockRoot = manifestRoot(dependencyLockManifest);
  const runtimeRoot = H("runtime-source-enumeration");
  const derivedAt = "2026-08-26T14:05:00.000Z";
  const staticImportGraphReceipt = sealV5R3Artifact({
    schemaVersion: "IndependentStaticImportGraphReceiptV1",
    designId: "MAIS-NATURAL-CA60-V5",
    runnerVersion: "V5-R8",
    verifierSourceTreeRoot,
    importEdges: [["independent/verifier.mjs", "node:assert"]],
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
    commands: [{ argv: [process.execPath, "--test", "independent/verifier.test.mjs"],
      exitCode: 0, stdoutHash: H("stdout"), stderrHash: H("stderr") }],
    allCommandsExitedZero: true,
    derivedAt,
  });
  const independentSourceEnumerationReceipt = sealV5R3Artifact({
    schemaVersion: "IndependentSourceEnumerationReceiptV1",
    designId: "MAIS-NATURAL-CA60-V5",
    runnerVersion: "V5-R8",
    baselineCommit: REGISTRATION_COMMIT,
    registeredRuntimeSourceEnumerationRootHash: runtimeRoot,
    recomputedRuntimeSourceEnumerationRootHash: runtimeRoot,
    enumeratedPathCount: 31,
    conclusion: "EXACT_MATCH",
    derivedAt,
  });
  const activeRegistration = {
    selfHash: H("registration"),
    runnerSourceCommit: SOURCE_COMMIT,
    productionSourceRootHash: H("production-root"),
    testSourceRootHash: H("test-root"),
    importClosureRootHash: H("import-root"),
    runtimeSourceEnumerationRootHash: runtimeRoot,
    registeredAt: "2026-08-26T14:00:00.000Z",
  };
  const registrationEvidence = { registrationCommit: REGISTRATION_COMMIT };
  const processArtifacts = { verifierSourceManifest, dependencyLockManifest,
    staticImportGraphReceipt, forbiddenPrimaryScorerPathScanReceipt, commandRuntimeReceipt,
    independentSourceEnumerationReceipt };
  const processEvidence = {
    verifierSourceTreeRoot,
    dependencyLockRoot,
    staticImportGraphHash: staticImportGraphReceipt.selfHash,
    forbiddenPrimaryScorerPathScanHash: forbiddenPrimaryScorerPathScanReceipt.selfHash,
    commandRuntimeHash: commandRuntimeReceipt.selfHash,
    baselineCommit: REGISTRATION_COMMIT,
    recomputedRuntimeSourceEnumerationRootHash: runtimeRoot,
    independentSourceEnumerationReceiptHash: independentSourceEnumerationReceipt.selfHash,
  };
  const freshReview = buildIndependentRunnerReviewReceiptV5R8({
    activeRegistration,
    registrationEvidence,
    processEvidence,
    reviewedAt: "2026-08-26T14:10:00.000Z",
    decision: "CONCURRED",
    findingCount: 0,
  });
  const reviewCustody = { verifiedFromGitObjects: true, reviewReceiptPathMutationCount: 1,
    reviewCommit: "c".repeat(40), reviewCommitParent: REGISTRATION_COMMIT,
    reviewReceiptHash: freshReview.selfHash };
  return { activeRegistration, registrationEvidence, freshReview, processArtifacts,
    reviewCustody };
}

test("R8 accepts only a recomputable A11 process-evidence bundle with exact Git custody", () => {
  const fixture = reviewFixture();
  assert.deepEqual(validateFreshRunnerReviewV5R8(fixture), []);
  assert.equal(fixture.freshReview.providerCallCount, 0);
  assert.equal(fixture.freshReview.naturalQuestionReadCount, 0);
  assert.equal(fixture.freshReview.decision, "CONCURRED");
});

test("R8 rejects process-evidence drift and a review commit not parented by the registration", () => {
  const fixture = reviewFixture();
  const drifted = structuredClone(fixture);
  drifted.processArtifacts.verifierSourceManifest[0].byteLength += 1;
  assert.ok(validateFreshRunnerReviewV5R8(drifted)
    .some((error) => /verifier source tree root/i.test(error)));

  const wrongParent = reviewFixture();
  wrongParent.reviewCustody.reviewCommitParent = "d".repeat(40);
  assert.ok(validateFreshRunnerReviewV5R8(wrongParent)
    .some((error) => /single-add Git object/i.test(error)));
});
