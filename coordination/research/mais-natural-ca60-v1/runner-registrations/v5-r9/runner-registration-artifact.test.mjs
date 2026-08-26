import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import REVIEWER_IDENTITY_ANCHOR from "../../../../reports/mais-natural-ca60-v5-r9-review-identity-a11/public-review-identity-anchor.json" with { type: "json" };
import {
  canonicalJsonV5R3,
  sha256V5R3,
} from "../../../../content-qa/mais-natural-ca60-v1/execution-integrity-v5-r3.mjs";
import {
  loadExactTrackedRunnerRegistrationV5R9,
  PRODUCTION_ENTRYPOINTS_V5_R9,
  R8_FINDING_IDS_V5_R9,
  validateActiveRunnerRegistrationV5R9,
  validateExactRunnerRegistrationEvidenceV5R9,
} from "../../../../content-qa/mais-natural-ca60-v1/execution-evidence-v5-r9.mjs";
import {
  collectFilesystemSourceClosureV5R6,
} from "../../../../content-qa/mais-natural-ca60-v1/source-closure-v5-r6.mjs";
import {
  buildRunnerSupersedingRegistrationFromGitV5R9,
  buildRunnerSupersedingRegistrationV5R9,
  registeredTestPathsV5R9,
  TEST_ENTRYPOINTS_V5_R9,
} from "./build-runner-registration.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../../../..");
const registrationPath = path.join(here, "runner-registration.json");

function syntheticManifest(paths, family) {
  return paths.map((sourcePath) => ({
    path: sourcePath,
    byteLength: Buffer.byteLength(sourcePath, "utf8") + 1,
    sha256: sha256V5R3(`${family}:${sourcePath}`),
  }));
}

async function registrationPresent() {
  try {
    await access(registrationPath);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

test("V5-R9 builder binds the reviewer identity, all R8 remediations, and exact zero authority", async () => {
  const productionClosure = await collectFilesystemSourceClosureV5R6({
    repoRoot,
    entryPoints: PRODUCTION_ENTRYPOINTS_V5_R9,
  });
  const testClosure = await collectFilesystemSourceClosureV5R6({
    repoRoot,
    entryPoints: TEST_ENTRYPOINTS_V5_R9,
  });
  const registration = buildRunnerSupersedingRegistrationV5R9({
    runnerSourceCommit: "e".repeat(40),
    productionClosure,
    testClosure,
    productionSourceManifest: syntheticManifest(productionClosure.paths, "production"),
    testSourceManifest: syntheticManifest(registeredTestPathsV5R9(testClosure), "test"),
    registeredAt: "2026-08-27T00:00:00.000Z",
  });
  assert.deepEqual(validateActiveRunnerRegistrationV5R9(registration), []);
  assert.deepEqual([...registration.remediatedFindingIds].sort(),
    [...R8_FINDING_IDS_V5_R9].sort());
  assert.equal(registration.reviewerIdentityAnchorHash, REVIEWER_IDENTITY_ANCHOR.selfHash);
  assert.equal(registration.reviewerKeyId, REVIEWER_IDENTITY_ANCHOR.keyId);
  assert.equal(registration.reviewerPublicKeyFingerprintSha256,
    REVIEWER_IDENTITY_ANCHOR.publicKeyFingerprintSha256);
  assert.equal(registration.providerEntrypoints.openAI.model, "gpt-5.6-luna");
  assert.equal(registration.providerEntrypoints.openAI.endpoint,
    "https://us.api.openai.com/v1/responses");
  assert.equal(registration.providerEntrypoints.openAI.projectResidency,
    "US_STORAGE_PROCESSING");
  assert.equal(registration.trustedProviderEvidenceAnchors.length, 0);
  assert.equal(registration.routeAuthenticityState,
    "ROUTE_AUTHENTICITY_BLOCKED_NO_PINNED_TRUST_ANCHOR");
  assert.equal(registration.decisionCeiling, "INCONCLUSIVE_MACHINE_REFERENCE");
  assert.equal(registration.a07CloseoutPolicy.closeoutCommitMustDirectlyParentRegistration, true);
  assert.equal(registration.a07CloseoutPolicy.freshReviewCommitMustDirectlyParentCloseout, true);
  for (const value of Object.values(registration.authorizationState)) {
    assert.ok(value === false || value === 0);
  }
});

test("sealed V5-R9 registration, when present, exactly rebuilds from its direct-parent source commit", async (t) => {
  if (!await registrationPresent()) {
    t.skip("pre-source-commit phase: immutable V5-R9 registration is intentionally absent");
    return;
  }
  const registration = JSON.parse(await readFile(registrationPath, "utf8"));
  const rebuilt = await buildRunnerSupersedingRegistrationFromGitV5R9({
    repoRoot,
    runnerSourceCommit: registration.runnerSourceCommit,
    registeredAt: registration.registeredAt,
  });
  assert.equal(canonicalJsonV5R3(rebuilt), canonicalJsonV5R3(registration));
});

test("V5-R9 registration loader, when present, proves single add, Git objects, and current bytes", async (t) => {
  if (!await registrationPresent()) {
    t.skip("pre-source-commit phase: immutable V5-R9 registration is intentionally absent");
    return;
  }
  const evidence = await loadExactTrackedRunnerRegistrationV5R9({ repoRoot });
  assert.deepEqual(validateExactRunnerRegistrationEvidenceV5R9(evidence), []);
  assert.equal(evidence.registrationPathMutationCount, 1);
  assert.equal(evidence.verifiedFromGitObjects, true);
  assert.equal(evidence.currentRuntimeBytesMatchRegisteredSource, true);
  assert.equal(evidence.immutableSingleAddPathVerified, true);
});
