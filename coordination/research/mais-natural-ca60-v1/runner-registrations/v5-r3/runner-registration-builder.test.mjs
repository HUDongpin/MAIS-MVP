import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import REGISTRATION_SCHEMA from "../../../../content-qa/mais-natural-ca60-v1/schemas/NaturalCaExecutionRunnerRegistrationV2.schema.json" with { type: "json" };
import { validateSelfHashV5R3 } from "../../../../content-qa/mais-natural-ca60-v1/execution-integrity-v5-r3.mjs";
import {
  buildNaturalCaExecutionRunnerRegistrationV5R3,
  PRODUCTION_SOURCE_PATHS_V5_R3,
  TEST_SOURCE_PATHS_V5_R3,
  workingTreeSourceReader,
} from "./build-runner-registration.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../..");

test("V5-R3 registration binds exact frozen roots, V5-R2 discrepancy/erratum lineage, source roots, and zero authority", async () => {
  const registration = await buildNaturalCaExecutionRunnerRegistrationV5R3({
    repoRoot: REPO_ROOT,
    runnerCommit: "a".repeat(40),
    registeredAt: "2026-08-26T08:00:00.000Z",
    readSource: workingTreeSourceReader,
  });
  assert.equal(validateSelfHashV5R3(registration), true);
  assert.equal(registration.supersedesRunnerRegistrationHash, "8845a0f08ca0190c855c10b364f83c1a9d424655bc1926895b59360dbea96fb2");
  assert.equal(registration.discrepancyReviewHash, "82d5e8edca9896f35f5c2271d84e62344a2eeb9b45ba0fa0e86c7fec354be4dd");
  assert.equal(registration.providerContractErratumHash, "f9fad74c0250b4e3e816ba755aca44070d87d23dce03b98bd7b6a60ad5492f1d");
  assert.equal(registration.frameRegistrationHash, "b8a4752e05fb8bf39a34afa6c63beb363731d08530069d9c454ad1b3e3fe975f");
  assert.equal(registration.sampleManifestHash, "d8856f0fb60f38eeecce5249e2018ba90417d68e0f84ef6e2ad9522016d9e159");
  assert.equal(registration.rightsPolicyHash, "c7f2832a701d813e928f1fa34f1b74d1d26a62c96f5bdea8be58d8bff134fe66");
  assert.equal(registration.lineageRuleHash, "8130bcd70f3e42332478a284b5a5b54e0c73b9f3696b1c1c06f25254ea0fe449");
  assert.equal(registration.authorizationState.providerExecutionAuthorized, false);
  assert.equal(registration.authorizationState.credentialReadAuthorized, false);
  assert.equal(registration.authorizationState.providerEventCount, 0);
  assert.equal(registration.providerImplementations.openAI.model, "gpt-5.6-luna");
  assert.equal(registration.providerImplementations.openAI.endpoint, "https://us.api.openai.com/v1/responses");
  assert.equal(registration.providerImplementations.deepSeek.referenceInputCount, 0);
  assert.equal(registration.productionSourceManifest.length, PRODUCTION_SOURCE_PATHS_V5_R3.length);
  assert.equal(registration.testSourceManifest.length, TEST_SOURCE_PATHS_V5_R3.length);
  assert.deepEqual(Object.keys(registration).sort(), Object.keys(REGISTRATION_SCHEMA.properties).sort());
  assert.deepEqual([...REGISTRATION_SCHEMA.required].sort(), Object.keys(REGISTRATION_SCHEMA.properties).sort());
});

test("V5-R3 registration requires an explicit timestamp, exact commit, and every source byte", async () => {
  await assert.rejects(buildNaturalCaExecutionRunnerRegistrationV5R3({ runnerCommit: "a".repeat(39), registeredAt: "2026-08-26T08:00:00.000Z", readSource: workingTreeSourceReader }), /runnerCommit/u);
  await assert.rejects(buildNaturalCaExecutionRunnerRegistrationV5R3({ runnerCommit: "a".repeat(40), readSource: workingTreeSourceReader }), /registeredAt/u);
  await assert.rejects(buildNaturalCaExecutionRunnerRegistrationV5R3({
    runnerCommit: "a".repeat(40),
    registeredAt: "2026-08-26T08:00:00.000Z",
    readSource: async () => Buffer.alloc(0),
  }), /empty/u);
});
