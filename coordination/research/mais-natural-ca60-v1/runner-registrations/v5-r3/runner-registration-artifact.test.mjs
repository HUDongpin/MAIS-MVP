import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { canonicalJsonV5R3, validateSelfHashV5R3 } from "../../../../content-qa/mais-natural-ca60-v1/execution-integrity-v5-r3.mjs";
import { buildNaturalCaExecutionRunnerRegistrationV5R3 } from "./build-runner-registration.mjs";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(ROOT, "../../../../..");

test("sealed V5-R3 registration exactly rebuilds from its exact Git source commit", async () => {
  const registration = JSON.parse(await readFile(path.join(ROOT, "runner-registration.json"), "utf8"));
  const rebuilt = await buildNaturalCaExecutionRunnerRegistrationV5R3({
    repoRoot: REPO_ROOT,
    runnerCommit: registration.runnerSourceCommit,
    registeredAt: registration.registeredAt,
  });
  assert.equal(validateSelfHashV5R3(registration), true);
  assert.equal(canonicalJsonV5R3(rebuilt), canonicalJsonV5R3(registration));
});

test("sealed V5-R3 registration preserves every zero-authority and claim ceiling field", async () => {
  const registration = JSON.parse(await readFile(path.join(ROOT, "runner-registration.json"), "utf8"));
  for (const key of ["credentialReadAuthorized", "providerExecutionAuthorized", "naturalQuestionEgressAuthorized", "tokenAuthorizationCreated", "attemptAuthorizationCreated", "usdAuthorizationCreated"]) {
    assert.equal(registration.authorizationState[key], false, `${key} must remain false`);
  }
  for (const key of ["credentialReadCount", "providerEventCount", "naturalQuestionEgressCount", "tokenCount", "attemptCount", "usdSpent", "referenceLabelCount", "naturalQuestionResultCount"]) {
    assert.equal(registration.authorizationState[key], 0, `${key} must remain zero`);
  }
  assert.equal(registration.decisionCeiling, "INCONCLUSIVE_MACHINE_REFERENCE");
  assert.equal(registration.providerImplementations.openAI.providerCallsMade, 0);
  assert.equal(registration.providerImplementations.deepSeek.providerCallsMade, 0);
});
