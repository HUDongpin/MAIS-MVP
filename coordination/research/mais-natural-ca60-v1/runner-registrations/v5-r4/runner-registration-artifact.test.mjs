import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  canonicalJsonV5R3,
  validateSelfHashV5R3,
} from "../../../../content-qa/mais-natural-ca60-v1/execution-integrity-v5-r3.mjs";
import {
  loadExactTrackedRunnerRegistrationV5R4,
  validateExactRunnerRegistrationEvidenceV5R4,
  validateProductionRunnerRegistrationV5R4,
} from "../../../../content-qa/mais-natural-ca60-v1/execution-evidence-v5-r4.mjs";
import { buildNaturalCaExecutionRunnerRegistrationV5R4 } from "./build-runner-registration.mjs";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(ROOT, "../../../../..");

test("sealed V5-R4 registration exactly rebuilds from its immutable parent Git source commit", async () => {
  const registration = JSON.parse(await readFile(path.join(ROOT, "runner-registration.json"), "utf8"));
  const rebuilt = await buildNaturalCaExecutionRunnerRegistrationV5R4({
    repoRoot: REPO_ROOT,
    runnerCommit: registration.runnerSourceCommit,
    registeredAt: registration.registeredAt,
  });
  assert.equal(validateSelfHashV5R3(registration), true);
  assert.deepEqual(validateProductionRunnerRegistrationV5R4(registration), []);
  assert.equal(canonicalJsonV5R3(rebuilt), canonicalJsonV5R3(registration));
});

test("production loader proves registration bytes, direct-parent source commit, and every source object", async () => {
  const evidence = await loadExactTrackedRunnerRegistrationV5R4({ repoRoot: REPO_ROOT });
  assert.deepEqual(validateExactRunnerRegistrationEvidenceV5R4(evidence), []);
  assert.equal(evidence.registrationCommit.length, 40);
  assert.equal(evidence.runnerSourceCommit, "63fc224c0b67d6b26e5713938f33ccda6fe998b1");
  assert.equal(evidence.registration.selfHash, "2dd4b0e17d577f085aee33f9ada3a2de0f7db79b02b32524e9d6a05858a61dc6");
  assert.equal(evidence.verifiedFromGitObjects, true);
});

test("sealed V5-R4 registration preserves zero authority and the descriptive-only claim ceiling", async () => {
  const registration = JSON.parse(await readFile(path.join(ROOT, "runner-registration.json"), "utf8"));
  for (const field of ["credentialReadAuthorized", "providerExecutionAuthorized", "naturalQuestionEgressAuthorized", "tokenAuthorizationCreated", "attemptAuthorizationCreated", "usdAuthorizationCreated"]) {
    assert.equal(registration.authorizationState[field], false, `${field} must remain false`);
  }
  for (const field of ["credentialReadCount", "providerEventCount", "naturalQuestionEgressCount", "tokenCount", "attemptCount", "usdSpent", "referenceLabelCount", "naturalQuestionResultCount"]) {
    assert.equal(registration.authorizationState[field], 0, `${field} must remain zero`);
  }
  assert.equal(registration.decisionCeiling, "INCONCLUSIVE_MACHINE_REFERENCE");
  assert.equal(registration.claimCeiling, "FRAME_AND_SAMPLE_FROZEN_RUNNER_OFFLINE_IMPLEMENTED_NOT_EXECUTED");
  assert.equal(registration.providerImplementations.openAI.providerCallsMade, 0);
  assert.equal(registration.providerImplementations.deepSeek.providerCallsMade, 0);
});
