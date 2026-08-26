import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import V5_R5_REGISTRATION from "../v5-r5/runner-registration.json" with { type: "json" };
import {
  canonicalJsonV5R3,
  sha256V5R3,
  validateSelfHashV5R3,
} from "../../../../content-qa/mais-natural-ca60-v1/execution-integrity-v5-r3.mjs";
import {
  loadExactTrackedRunnerRegistrationV5R6,
  PRODUCTION_ENTRYPOINTS_V5_R6,
  validateActiveRunnerRegistrationV5R6,
  validateExactRunnerRegistrationEvidenceV5R6,
} from "../../../../content-qa/mais-natural-ca60-v1/execution-evidence-v5-r6.mjs";
import {
  collectFilesystemSourceClosureV5R6,
} from "../../../../content-qa/mais-natural-ca60-v1/source-closure-v5-r6.mjs";
import {
  buildRunnerSupersedingRegistrationFromGitV5R6,
  buildRunnerSupersedingRegistrationV5R6,
  TEST_PATHS_V5_R6,
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
  try { await access(registrationPath); return true; }
  catch (error) { if (error?.code === "ENOENT") return false; throw error; }
}

test("V5-R6 builder preserves every frozen root, provider tuple, decision ceiling, and zero authority", async () => {
  const closure = await collectFilesystemSourceClosureV5R6({
    repoRoot,
    entryPoints: PRODUCTION_ENTRYPOINTS_V5_R6,
  });
  const registration = buildRunnerSupersedingRegistrationV5R6({
    runnerSourceCommit: "e".repeat(40),
    productionClosure: closure,
    productionSourceManifest: syntheticManifest(closure.paths, "production"),
    testSourceManifest: syntheticManifest(TEST_PATHS_V5_R6, "test"),
    registeredAt: "2026-08-26T09:00:00.000Z",
  });
  assert.deepEqual(validateActiveRunnerRegistrationV5R6(registration), []);
  for (const field of ["designRegistrationHash", "frameRegistrationHash", "samplingFrameHash",
    "sampleManifestHash", "samplePayloadSetHash", "sampleSelectionContentRootHash", "c0RandomAuditHash",
    "privacyScreenHash", "rightsScreenHash", "ownerDecisionRequestHash", "ownerDecisionReceiptHash",
    "rightsPolicyHash", "lineageRuleHash", "taxonomyHash", "labelingAndAdjudicationHash",
    "thresholdsDecisionAndPowerHash", "decisionCeiling", "providerContractErratumHash"]) {
    assert.equal(registration[field], V5_R5_REGISTRATION[field], `${field} drifted from V5-R5`);
  }
  assert.equal(registration.providerEntrypoints.openAI.projectResidency, "US_STORAGE_PROCESSING");
  assert.equal(registration.providerEntrypoints.deepSeek.projectResidency, "UNRESOLVED");
  assert.equal(registration.decisionCeiling, "INCONCLUSIVE_MACHINE_REFERENCE");
  assert.equal(registration.claimCeiling, "FRAME_AND_SAMPLE_FROZEN_RUNNER_OFFLINE_IMPLEMENTED_NOT_EXECUTED");
  for (const value of Object.values(registration.authorizationState)) assert.ok(value === false || value === 0);
  assert.equal(validateSelfHashV5R3(registration), true);
});

test("sealed R6 registration, when present, exactly rebuilds from its direct-parent source commit", async (t) => {
  if (!await registrationPresent()) {
    t.skip("pre-source-commit phase: immutable R6 registration is intentionally absent");
    return;
  }
  const registration = JSON.parse(await readFile(registrationPath, "utf8"));
  const rebuilt = await buildRunnerSupersedingRegistrationFromGitV5R6({
    repoRoot,
    runnerSourceCommit: registration.runnerSourceCommit,
    registeredAt: registration.registeredAt,
  });
  assert.equal(canonicalJsonV5R3(rebuilt), canonicalJsonV5R3(registration));
});

test("production loader, when registration is present, proves immutable add commit, exact Git objects, and current bytes", async (t) => {
  if (!await registrationPresent()) {
    t.skip("pre-source-commit phase: immutable R6 registration is intentionally absent");
    return;
  }
  const evidence = await loadExactTrackedRunnerRegistrationV5R6({ repoRoot });
  assert.deepEqual(validateExactRunnerRegistrationEvidenceV5R6(evidence), []);
  assert.equal(evidence.registrationPathMutationCount, 1);
  assert.equal(evidence.verifiedFromGitObjects, true);
  assert.equal(evidence.currentRuntimeBytesMatchRegisteredSource, true);
  assert.equal(evidence.immutableSingleAddPathVerified, true);
});
